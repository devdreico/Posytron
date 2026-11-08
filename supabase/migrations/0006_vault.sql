-- Posytron · BYOK en Supabase Vault
-- La API key del cliente nunca se guarda en texto plano ni vuelve al navegador.
-- Solo la Edge Function con service_role puede leerla.

-- Solo los últimos 4 caracteres se muestran en la UI.
alter table public.ai_settings add column if not exists api_key_hint text;

create or replace function public.set_ai_secret(p_tenant_id uuid, p_api_key text)
returns uuid
language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare
  v_id uuid;
begin
  if p_api_key is null or length(trim(p_api_key)) < 10 then
    raise exception 'API key inválida';
  end if;

  select vault_secret_id into v_id from public.ai_settings where tenant_id = p_tenant_id;

  if v_id is null then
    v_id := vault.create_secret(
      trim(p_api_key),
      'tenant_' || p_tenant_id::text || '_ai_key',
      'API key BYOK del tenant ' || p_tenant_id::text
    );

    insert into public.ai_settings (tenant_id, vault_secret_id, enabled)
    values (p_tenant_id, v_id, true)
    on conflict (tenant_id) do update
      set vault_secret_id = excluded.vault_secret_id,
          enabled = true;
  else
    perform vault.update_secret(v_id, trim(p_api_key));
  end if;

  insert into public.audit_log (tenant_id, actor, action, detail)
  values (p_tenant_id, 'sistema', 'ia.clave_configurada', 'vault');

  return v_id;
end $$;

revoke execute on function public.set_ai_secret(uuid, text) from authenticated, anon;

create or replace function public.clear_ai_secret(p_tenant_id uuid)
returns void
language plpgsql security definer set search_path = public, vault, pg_temp as $$
declare v_id uuid;
begin
  select vault_secret_id into v_id from public.ai_settings where tenant_id = p_tenant_id;
  if v_id is not null then
    delete from vault.secrets where id = v_id;
  end if;
  update public.ai_settings
     set vault_secret_id = null, enabled = false, api_key_hint = null
   where tenant_id = p_tenant_id;
end $$;

revoke execute on function public.clear_ai_secret(uuid) from authenticated, anon;

-- Solo service_role (Edge Function) puede leer el secreto.
create or replace function public.read_ai_secret(p_tenant uuid)
returns text
language sql security definer set search_path = public, vault, pg_temp as $$
  select ds.decrypted_secret
  from public.ai_settings s
  join vault.decrypted_secrets ds on ds.id = s.vault_secret_id
  where s.tenant_id = p_tenant
$$;

revoke execute on function public.read_ai_secret(uuid) from authenticated, anon;

