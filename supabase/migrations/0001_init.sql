-- Posytron · esquema base v0.1
-- Multi-tenant: cada fila de negocio lleva tenant_id y queda protegida por RLS (0002).
-- Dinero: BIGINT en unidades menores (centavos) + código ISO de moneda en el tenant.

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "unaccent";
create extension if not exists "vector";

-- ---------- enums ----------
do $$ begin
  create type plan_t as enum ('free', 'pro', 'premium');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tenant_status_t as enum ('provisioned', 'onboarding_pending', 'setup_running', 'active', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_role_t as enum ('owner', 'admin', 'supervisor', 'cashier');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tool_kind_t as enum ('query', 'report', 'calculator', 'action', 'automation', 'playbook', 'integration');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sale_status_t as enum ('completed', 'voided', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type purchase_status_t as enum ('draft', 'pending', 'received', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status_t as enum ('trialing', 'active', 'past_due', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------- plataforma ----------
create table if not exists public.tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  name          text not null,
  country       text not null default 'CO',
  currency      text not null default 'COP',
  locale        text not null default 'es-CO',
  timezone      text not null default 'America/Bogota',
  plan          plan_t not null default 'free',
  status        tenant_status_t not null default 'provisioned',
  trial_ends_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- identidad: un auth.user pertenece a un tenant (o es superadmin de plataforma)
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        member_role_t not null default 'owner',
  display_name text not null,
  employee_id uuid,
  created_at  timestamptz not null default now(),
  unique (tenant_id, user_id)
);
create index if not exists members_user_idx on public.members(user_id);

create table if not exists public.business_profiles (
  tenant_id  uuid primary key references public.tenants(id) on delete cascade,
  admin      jsonb not null default '{}'::jsonb,
  business   jsonb not null default '{}'::jsonb,
  location   jsonb not null default '{}'::jsonb,
  ops        jsonb not null default '{}'::jsonb,
  process    jsonb,
  setup_done boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  name       text not null,
  address    text,
  timezone   text not null default 'America/Bogota',
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists branches_tenant_idx on public.branches(tenant_id);

create table if not exists public.registers (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  branch_id  uuid not null references public.branches(id) on delete cascade,
  name       text not null default 'Caja 1',
  created_at timestamptz not null default now()
);
create index if not exists registers_tenant_idx on public.registers(tenant_id);

create table if not exists public.employees (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  username    text not null,
  name        text not null,
  role        member_role_t not null default 'cashier',
  pin_hash    text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tenant_id, username)
);
create index if not exists employees_tenant_idx on public.employees(tenant_id);

-- ---------- catálogo ----------
create table if not exists public.categories (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name      text not null,
  unique (tenant_id, name)
);

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name        text not null,
  sku         text,
  barcode     text,
  unit        text not null default 'un',
  price       bigint not null default 0 check (price >= 0),
  cost        bigint not null default 0 check (cost >= 0),
  tax_rate    numeric(5,4) not null default 0.19,
  stock       numeric(14,3) not null default 0,
  min_stock   numeric(14,3) not null default 0,
  track_stock boolean not null default true,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists products_tenant_idx on public.products(tenant_id);
create unique index if not exists products_tenant_barcode_idx on public.products(tenant_id, barcode) where barcode is not null;
create index if not exists products_search_idx on public.products using gin (to_tsvector('spanish', name));

-- ---------- caja ----------
create table if not exists public.shifts (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  register_id    uuid references public.registers(id) on delete set null,
  opened_by      uuid references public.members(id) on delete set null,
  cashier_name   text not null,
  opening_float  bigint not null default 0,
  closing_count  bigint,
  expected       bigint,
  difference     bigint,
  opened_at      timestamptz not null default now(),
  closed_at      timestamptz
);
create index if not exists shifts_tenant_open_idx on public.shifts(tenant_id) where closed_at is null;
create unique index if not exists shifts_single_open_idx on public.shifts(tenant_id) where closed_at is null;

create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  name         text not null,
  phone        text,
  credit_limit bigint not null default 0,
  balance      bigint not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists customers_tenant_idx on public.customers(tenant_id);

create table if not exists public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  name          text not null,
  phone         text,
  balance       bigint not null default 0,
  last_order_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists suppliers_tenant_idx on public.suppliers(tenant_id);

create table if not exists public.sales (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  shift_id    uuid references public.shifts(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  folio       text not null,
  status      sale_status_t not null default 'completed',
  subtotal    bigint not null default 0,
  tax         bigint not null default 0,
  discount    bigint not null default 0,
  total       bigint not null default 0,
  cashier     text not null,
  at          timestamptz not null default now(),
  unique (tenant_id, folio)
);
create index if not exists sales_tenant_at_idx on public.sales(tenant_id, at desc);

create table if not exists public.sale_items (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  sale_id    uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name       text not null,
  qty        numeric(14,3) not null,
  unit_price bigint not null,
  tax_rate   numeric(5,4) not null default 0,
  tax_amount bigint not null default 0,
  total      bigint not null
);
create index if not exists sale_items_sale_idx on public.sale_items(sale_id);

create table if not exists public.payments (
  id       uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sale_id  uuid not null references public.sales(id) on delete cascade,
  method   text not null,
  amount   bigint not null,
  ref      text
);
create index if not exists payments_sale_idx on public.payments(sale_id);

create table if not exists public.purchases (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  folio       text not null,
  status      purchase_status_t not null default 'pending',
  total       bigint not null default 0,
  at          timestamptz not null default now(),
  unique (tenant_id, folio)
);
create index if not exists purchases_tenant_idx on public.purchases(tenant_id, at desc);

create table if not exists public.purchase_lines (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  name        text not null,
  qty         numeric(14,3) not null,
  unit_cost   bigint not null
);
create index if not exists purchase_lines_purchase_idx on public.purchase_lines(purchase_id);

create table if not exists public.expenses (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category  text not null,
  amount    bigint not null check (amount >= 0),
  note      text not null default '',
  at        timestamptz not null default now()
);
create index if not exists expenses_tenant_at_idx on public.expenses(tenant_id, at desc);

-- ---------- herramientas (catálogo global) ----------
create table if not exists public.tools (
  key         text primary key,
  name        text not null,
  description text not null,
  category    text not null,
  kind        tool_kind_t not null,
  verticals   text[] not null default '{}',
  impact      int not null default 3,
  min_plan    plan_t not null default 'pro',
  ai_enabled  boolean not null default true,
  operation   text,
  entity      text,
  sort_index  int not null default 0,
  embedding   vector(768)
);
create index if not exists tools_category_idx on public.tools(category);
create index if not exists tools_embedding_idx on public.tools using ivfflat (embedding vector_cosine_ops) with (lists = 20);

create table if not exists public.tenant_tools (
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  tool_key   text not null references public.tools(key) on delete cascade,
  pinned     boolean not null default false,
  rank       int not null default 0,
  last_used  timestamptz,
  primary key (tenant_id, tool_key)
);

-- ---------- IA ----------
create table if not exists public.ai_settings (
  tenant_id  uuid primary key references public.tenants(id) on delete cascade,
  provider   text not null default 'google',
  model      text not null default 'gemini-2.0-flash',
  vault_secret_id uuid,             -- BYOK cifrado en Supabase Vault
  enabled    boolean not null default false,
  used_today int not null default 0,
  used_hour  int not null default 0,
  day_reset  date not null default current_date,
  hour_reset timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id         bigserial primary key,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  member_id  uuid references public.members(id) on delete set null,
  role       text not null check (role in ('user', 'assistant', 'tool')),
  content    text not null,
  tool_key   text,
  tokens     int,
  at         timestamptz not null default now()
);
create index if not exists ai_messages_tenant_idx on public.ai_messages(tenant_id, at desc);

-- ---------- facturación ----------
create table if not exists public.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  plan              plan_t not null,
  status            subscription_status_t not null default 'trialing',
  provider          text not null default 'mercadopago',
  provider_ref      text,
  current_period_end timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists subscriptions_tenant_idx on public.subscriptions(tenant_id);

create table if not exists public.payment_events (
  id          bigserial primary key,
  provider    text not null default 'mercadopago',
  external_id text not null,
  tenant_id   uuid references public.tenants(id) on delete set null,
  kind        text not null,
  payload     jsonb not null,
  received_at timestamptz not null default now(),
  unique (provider, external_id)
);

-- ---------- auditoría ----------
create table if not exists public.audit_log (
  id        bigserial primary key,
  tenant_id uuid references public.tenants(id) on delete cascade,
  actor_id  uuid references auth.users(id) on delete set null,
  actor     text not null,
  action    text not null,
  detail    text not null default '',
  at        timestamptz not null default now()
);
create index if not exists audit_tenant_idx on public.audit_log(tenant_id, at desc);

-- ---------- updated_at ----------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists tenants_touch on public.tenants;
create trigger tenants_touch before update on public.tenants
  for each row execute function public.touch_updated_at();

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();
