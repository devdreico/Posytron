-- Posytron · planes, cuotas de IA y activación de suscripciones

create or replace function public.plan_limits(p_plan plan_t)
returns jsonb
language sql immutable as $$
  select case p_plan
    when 'premium' then jsonb_build_object('employees', 10, 'ai', true, 'sell', true, 'ai_quotas', jsonb_build_object('day', 150, 'hour', 20))
    when 'pro'     then jsonb_build_object('employees', 3,  'ai', false, 'sell', true, 'ai_quotas', jsonb_build_object('day', 0, 'hour', 0))
    else                jsonb_build_object('employees', 0,  'ai', false, 'sell', false, 'ai_quotas', jsonb_build_object('day', 0, 'hour', 0))
  end
$$;

-- Plan efectivo: el trial de 14 días se comporta como Pro.
create or replace function public.effective_plan(p_tenant_id uuid)
returns plan_t
language sql stable security invoker as $$
  select case
    when t.plan <> 'free' then t.plan
    when t.trial_ends_at is not null and t.trial_ends_at > now() then 'pro'::plan_t
    else 'free'::plan_t
  end
  from public.tenants t
  where t.id = p_tenant_id
$$;

-- Valida el cupo de empleados antes de invitar.
create or replace function public.can_add_employee(p_tenant_id uuid)
returns boolean
language sql stable security invoker as $$
  select count(*) < (public.plan_limits(public.effective_plan(p_tenant_id)) ->> 'employees')::int
  from public.employees
  where tenant_id = p_tenant_id
$$;

-- Consume una consulta de IA respetando fair use. Devuelve false si no hay cupo.
create or replace function public.consume_ai_quota(p_tenant_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  s     public.ai_settings;
  plan  plan_t := public.effective_plan(p_tenant_id);
  lim   jsonb := public.plan_limits(plan);
  day_max  int := coalesce((lim -> 'ai_quotas' ->> 'day')::int, 0);
  hour_max int := coalesce((lim -> 'ai_quotas' ->> 'hour')::int, 0);
begin
  select * into s from public.ai_settings where tenant_id = p_tenant_id for update;
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'sin_configuracion');
  end if;

  -- La clave propia (BYOK) no consume la cuota de Posytron.
  if s.vault_secret_id is not null then
    update public.ai_settings set used_today = used_today + 1 where tenant_id = p_tenant_id;
    return jsonb_build_object('allowed', true, 'mode', 'byok');
  end if;

  if plan <> 'premium' then
    return jsonb_build_object('allowed', false, 'reason', 'plan');
  end if;

  if s.day_reset <> current_date then
    s.used_today := 0;
    s.day_reset := current_date;
  end if;
  if s.hour_reset < now() - interval '1 hour' then
    s.used_hour := 0;
    s.hour_reset := now();
  end if;

  if s.used_today >= day_max then
    return jsonb_build_object('allowed', false, 'reason', 'cuota_diaria', 'limit', day_max);
  end if;
  if s.used_hour >= hour_max then
    return jsonb_build_object('allowed', false, 'reason', 'cuota_horaria', 'limit', hour_max);
  end if;

  update public.ai_settings
     set used_today = s.used_today + 1,
         used_hour  = s.used_hour + 1,
         day_reset  = s.day_reset,
         hour_reset = s.hour_reset
   where tenant_id = p_tenant_id;

  return jsonb_build_object('allowed', true, 'mode', 'included', 'left_today', day_max - s.used_today - 1);
end $$;

revoke execute on function public.consume_ai_quota(uuid) from anon;

-- Activación desde el webhook de MercadoPago (service_role).
-- Idempotente: el evento se registra antes de aplicar el cambio.
create or replace function public.activate_subscription(
  p_tenant_id uuid,
  p_plan plan_t,
  p_provider_ref text,
  p_event_id text,
  p_payload jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.payment_events (external_id, tenant_id, kind, payload)
  values (p_event_id, p_tenant_id, 'subscription.activated', p_payload)
  on conflict (provider, external_id) do nothing;

  insert into public.subscriptions (tenant_id, plan, status, provider_ref, current_period_end)
  values (p_tenant_id, p_plan, 'active', p_provider_ref, now() + interval '1 month');

  update public.tenants
     set plan = p_plan,
         status = 'active',
         trial_ends_at = null
   where id = p_tenant_id;

  insert into public.audit_log (tenant_id, actor, action, detail)
  values (p_tenant_id, 'mercadopago', 'plan.activated', p_plan::text);
end $$;

revoke execute on function public.activate_subscription(uuid, plan_t, text, text, jsonb) from authenticated, anon;

create or replace function public.cancel_subscription(p_tenant_id uuid, p_event_id text, p_payload jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.payment_events (external_id, tenant_id, kind, payload)
  values (p_event_id, p_tenant_id, 'subscription.cancelled', p_payload)
  on conflict (provider, external_id) do nothing;

  update public.subscriptions
     set status = 'cancelled', updated_at = now()
   where tenant_id = p_tenant_id;

  update public.tenants set plan = 'free', status = 'active' where id = p_tenant_id;

  insert into public.audit_log (tenant_id, actor, action, detail)
  values (p_tenant_id, 'mercadopago', 'plan.cancelled', 'vuelve a free');
end $$;

revoke execute on function public.cancel_subscription(uuid, text, jsonb) from authenticated, anon;

-- Reset diario de contadores (pg_cron opcional).
create or replace function public.reset_ai_counters()
returns void language sql security definer as $$
  update public.ai_settings
     set used_today = 0, used_hour = 0, day_reset = current_date, hour_reset = now()
   where day_reset < current_date or hour_reset < now() - interval '1 hour'
$$;
