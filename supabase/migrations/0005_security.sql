-- Posytron · seguridad de acceso de empleados
-- PIN con bcrypt (pgcrypto). Intentos fallidos con bloqueo temporal.

create table if not exists public.login_attempts (
  id         bigserial primary key,
  tenant_id  uuid references public.tenants(id) on delete cascade,
  username   text not null,
  at         timestamptz not null default now()
);
create index if not exists login_attempts_idx on public.login_attempts(tenant_id, username, at desc);
alter table public.login_attempts enable row level security;

create or replace function public.verify_pin(p_hash text, p_pin text)
returns boolean
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  return p_hash = crypt(p_pin, p_hash);
end $$;

revoke execute on function public.verify_pin(text, text) from authenticated, anon;

create or replace function public.log_login_failure(p_tenant uuid, p_username text)
returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into public.login_attempts (tenant_id, username) values (p_tenant, p_username)
$$;

revoke execute on function public.log_login_failure(uuid, text) from authenticated, anon;

-- >8 intentos en 15 minutos bloquean el usuario.
create or replace function public.login_blocked(p_tenant uuid, p_username text)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select count(*) >= 8
  from public.login_attempts
  where tenant_id = p_tenant and username = p_username and at > now() - interval '15 minutes'
$$;

revoke execute on function public.login_blocked(uuid, text) from authenticated, anon;

-- Alta o cambio de PIN de un empleado (owner/admin).
create or replace function public.set_employee_pin(p_employee_id uuid, p_pin text)
returns void
language plpgsql security invoker set search_path = public, extensions, pg_temp as $$
begin
  if length(p_pin) < 4 or length(p_pin) > 6 or p_pin !~ '^\d+$' then
    raise exception 'El PIN debe tener entre 4 y 6 dígitos';
  end if;
  if not exists (
    select 1 from public.employees e
    where e.id = p_employee_id
      and e.tenant_id = public.current_tenant_id()
      and public.current_member_role() in ('owner', 'admin')
  ) then
    raise exception 'No autorizado';
  end if;

  update public.employees set pin_hash = crypt(p_pin, gen_salt('bf', 10)) where id = p_employee_id;

  insert into public.audit_log (tenant_id, actor, action, detail)
  values (public.current_tenant_id(), 'sistema', 'empleado.pin_actualizado', p_employee_id::text);
end $$;

create or replace function public.create_employee(
  p_username text,
  p_name text,
  p_role member_role_t,
  p_pin text
) returns public.employees
language plpgsql security invoker set search_path = public, extensions, pg_temp as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_plan   plan_t;
  v_limit  int;
  v_emp    public.employees;
begin
  if v_tenant is null then raise exception 'Sin tenant'; end if;
  if public.current_member_role() not in ('owner', 'admin') then raise exception 'No autorizado'; end if;

  v_plan := public.effective_plan(v_tenant);
  v_limit := (public.plan_limits(v_plan) ->> 'employees')::int;

  if (select count(*) from public.employees where tenant_id = v_tenant) >= v_limit then
    raise exception 'Tu plan % permite % empleados', v_plan, v_limit;
  end if;

  if length(p_pin) < 4 or length(p_pin) > 6 or p_pin !~ '^\d+$' then
    raise exception 'El PIN debe tener entre 4 y 6 dígitos';
  end if;

  insert into public.employees (tenant_id, username, name, role, pin_hash)
  values (v_tenant, lower(trim(p_username)), p_name, p_role, crypt(p_pin, gen_salt('bf', 10)))
  returning * into v_emp;

  insert into public.audit_log (tenant_id, actor, action, detail)
  values (v_tenant, coalesce(public.jwt_claim('display_name'), 'usuario'), 'empleado.creado', v_emp.username);

  return v_emp;
end $$;
