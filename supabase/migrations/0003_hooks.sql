-- Posytron · hook de JWT, provisión de tenants y utilidades
-- El hook inyecta tenant_id, member_role y platform_admin en el access token.
-- Se registra en Supabase: Authentication → Hooks → Custom Access Token → public.custom_access_token_hook

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  claims   jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  uid      uuid  := nullif(event -> 'user_id', '')::uuid;
  m        record;
begin
  select mb.tenant_id, mb.role into m
  from public.members mb
  where mb.user_id = uid
  order by case mb.role when 'owner' then 0 when 'admin' then 1 else 2 end
  limit 1;

  if m.tenant_id is not null then
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(m.tenant_id::text), true);
    claims := jsonb_set(claims, '{member_role}', to_jsonb(m.role::text), true);
  end if;

  -- Superadmin de plataforma: se marca en app_metadata al crear el usuario.
  if coalesce((event -> 'claims' -> 'app_metadata' ->> 'platform_admin')::boolean, false) then
    claims := jsonb_set(claims, '{platform_admin}', 'true'::jsonb, true);
  end if;

  return jsonb_set(event, '{claims}', claims, true);
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.members to supabase_auth_admin;

revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- ---------- provisión de un tenant nuevo ----------
-- Llamada por la Edge Function register-tenant (service_role) después de crear el auth.user.
create or replace function public.provision_tenant(
  p_user_id uuid,
  p_business_name text,
  p_admin_name text,
  p_country text default 'CO',
  p_currency text default 'COP',
  p_locale text default 'es-CO',
  p_timezone text default 'America/Bogota'
) returns public.tenants
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_slug text;
  v_tenant public.tenants;
begin
  v_slug := trim(both '-' from regexp_replace(lower(unaccent(p_business_name)), '[^a-z0-9]+', '-', 'g'));
  if v_slug is null or v_slug = '' then
    v_slug := 'negocio-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;
  if exists (select 1 from public.tenants where slug = v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  end if;

  insert into public.tenants (slug, name, country, currency, locale, timezone, plan, status, trial_ends_at)
  values (v_slug, p_business_name, p_country, p_currency, p_locale, p_timezone, 'free', 'onboarding_pending', now() + interval '14 days')
  returning * into v_tenant;

  insert into public.members (tenant_id, user_id, role, display_name)
  values (v_tenant.id, p_user_id, 'owner', p_admin_name);

  insert into public.business_profiles (tenant_id, admin)
  values (v_tenant.id, jsonb_build_object('name', p_admin_name));

  insert into public.branches (tenant_id, name, is_primary)
  values (v_tenant.id, 'Principal', true);

  insert into public.registers (tenant_id, branch_id, name)
  select v_tenant.id, b.id, 'Caja 1' from public.branches b where b.tenant_id = v_tenant.id;

  insert into public.ai_settings (tenant_id, enabled)
  values (v_tenant.id, false);

  insert into public.audit_log (tenant_id, actor, action, detail)
  values (v_tenant.id, p_admin_name, 'tenant.provisioned', v_slug);

  return v_tenant;
end $$;

revoke execute on function public.provision_tenant(uuid, text, text, text, text, text, text) from authenticated, anon;

-- ---------- herramientas sugeridas por perfil ----------
-- Devuelve las herramientas ordenadas por afinidad con el vertical del negocio.
create or replace function public.suggested_tools(p_vertical text default null, p_limit int default 24)
returns setof public.tools
language sql stable security invoker as $$
  select t.*
  from public.tools t
  where p_vertical is null or p_vertical = any (t.verticals)
  order by
    (p_vertical = any (t.verticals)) desc,
    t.impact desc,
    t.sort_index
  limit greatest(1, least(p_limit, 100))
$$;

-- ---------- auditoría desde el cliente ----------
create or replace function public.log_action(p_action text, p_detail text default '')
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.audit_log (tenant_id, actor_id, actor, action, detail)
  values (
    public.current_tenant_id(),
    auth.uid(),
    coalesce(public.jwt_claim('display_name'), 'usuario'),
    p_action,
    p_detail
  )
$$;

revoke execute on function public.log_action(text, text) from anon;
