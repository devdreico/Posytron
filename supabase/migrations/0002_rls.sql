-- Posytron · RLS y aislamiento multi-tenant
-- Regla: el cliente solo ve filas de su tenant. El tenant y el rol viajan en el JWT
-- (ver 0003_hooks.sql). Escrituras sensibles (pagos, planes, tools) pasan por
-- service_role o por funciones SECURITY DEFINER.

create or replace function public.jwt_claim(name text) returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> name
$$;

create or replace function public.current_tenant_id() returns uuid
language sql stable as $$
  select nullif(public.jwt_claim('tenant_id'), '')::uuid
$$;

create or replace function public.current_member_role() returns text
language sql stable as $$
  select coalesce(public.jwt_claim('member_role'), 'none')
$$;

create or replace function public.is_platform_admin() returns boolean
language sql stable as $$
  select coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'platform_admin')::boolean, false)
$$;

-- Helper: aplica el mismo patrón a todas las tablas con tenant_id.
do $$
declare t text;
begin
  foreach t in array array[
    'business_profiles','branches','registers','employees','categories','products',
    'shifts','customers','suppliers','sales','sale_items','payments','purchases',
    'purchase_lines','expenses','tenant_tools','ai_settings','ai_messages','subscriptions','audit_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_read on public.%I', t);
    execute format(
      'create policy tenant_read on public.%I for select using (tenant_id = public.current_tenant_id() or public.is_platform_admin())', t);
    execute format('drop policy if exists tenant_write on public.%I', t);
    execute format(
      'create policy tenant_write on public.%I for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id())', t);
  end loop;
end $$;

alter table public.tenants enable row level security;

drop policy if exists tenant_self_read on public.tenants;
create policy tenant_self_read on public.tenants
  for select using (id = public.current_tenant_id() or public.is_platform_admin());

drop policy if exists tenant_self_update on public.tenants;
create policy tenant_self_update on public.tenants
  for update using (id = public.current_tenant_id())
  with check (id = public.current_tenant_id());

-- El catálogo de herramientas es global y de solo lectura para clientes.
alter table public.tools enable row level security;

drop policy if exists tools_read on public.tools;
create policy tools_read on public.tools for select using (true);

-- members: cada quien ve su membresía; owner/admin ven las de su tenant.
alter table public.members enable row level security;

drop policy if exists members_read on public.members;
create policy members_read on public.members
  for select using (
    user_id = auth.uid()
    or tenant_id = public.current_tenant_id()
    or public.is_platform_admin()
  );

-- ---------- restricciones por rol ----------
-- Cajero no puede cambiar precios ni costos.
create or replace function public.guard_product_write() returns trigger
language plpgsql as $$
begin
  if public.current_member_role() in ('cashier') then
    if new.price is distinct from old.price or new.cost is distinct from old.cost then
      raise exception 'Tu rol no puede modificar precios o costos';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists products_role_guard on public.products;
create trigger products_role_guard before update on public.products
  for each row execute function public.guard_product_write();

-- El plan y el estado del tenant solo los cambia la plataforma (service_role).
create or replace function public.guard_tenant_billing() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('request.jwt.claims', true), '') <> '' and not public.is_platform_admin() then
    if new.plan is distinct from old.plan or new.status is distinct from old.status then
      raise exception 'El plan y el estado solo los puede cambiar Posytron';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists tenants_billing_guard on public.tenants;
create trigger tenants_billing_guard before update on public.tenants
  for each row execute function public.guard_tenant_billing();

-- ---------- vistas de estado para la IA ----------
-- La IA nunca escribe SQL: lee estas vistas ya acotadas a su tenant.
create or replace view public.business_state_kpis
with (security_invoker = true) as
select
  t.id                                                        as tenant_id,
  t.name,
  t.currency,
  coalesce(sum(s.total) filter (where s.at >= date_trunc('day', now())), 0)   as sales_today,
  coalesce(sum(s.total) filter (where s.at >= now() - interval '7 days'), 0)  as sales_7d,
  count(s.id) filter (where s.at >= date_trunc('day', now()))                 as tickets_today,
  coalesce((select sum(balance) from public.customers c where c.tenant_id = t.id), 0) as receivables,
  coalesce((select sum(balance) from public.suppliers p where p.tenant_id = t.id), 0) as payables
from public.tenants t
left join public.sales s on s.tenant_id = t.id and s.status = 'completed'
group by t.id, t.name, t.currency;

create or replace view public.business_state_low_stock
with (security_invoker = true) as
select p.tenant_id, p.id, p.name, p.stock, p.min_stock, p.unit
from public.products p
where p.active and p.track_stock and p.stock <= p.min_stock;

create or replace function public.tenant_metrics()
returns jsonb
language sql stable security invoker as $$
  select jsonb_build_object(
    'sales_today', coalesce((select sum(total) from public.sales where tenant_id = public.current_tenant_id() and at >= date_trunc('day', now())), 0),
    'sales_7d',    coalesce((select sum(total) from public.sales where tenant_id = public.current_tenant_id() and at >= now() - interval '7 days'), 0),
    'receivables', coalesce((select sum(balance) from public.customers where tenant_id = public.current_tenant_id()), 0),
    'payables',    coalesce((select sum(balance) from public.suppliers where tenant_id = public.current_tenant_id()), 0),
    'low_stock',   (select count(*) from public.products where tenant_id = public.current_tenant_id() and active and stock <= min_stock)
  )
$$;
