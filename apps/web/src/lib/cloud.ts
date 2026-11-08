import { supabase, isCloud } from "./supabase";
import { getDB, mutate } from "./store";
import type { DB, Product, Sale, Customer, Supplier, Purchase, Expense, Employee, Shift, BusinessProfile } from "./types";
import { DEMO_SLUG } from "./seed";

export { isCloud };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function edge(name: string) {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

async function callEdge<T = unknown>(name: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(edge(name), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON ?? "",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string; message?: string }).error ?? (data as { message?: string }).message ?? `HTTP ${res.status}`);
  return data as T;
}

export async function cloudLoginOwner(slug: string, password: string, code: string): Promise<{ ok: boolean; error?: string }> {
  if (!isCloud || !supabase) return { ok: false, error: "Sin conexión a Supabase" };
  try {
    const data = await callEdge<{ access_token: string; refresh_token: string; tenant?: { slug: string } }>(
      "owner-login",
      { slug: slug.trim().toLowerCase(), password, totpCode: code },
    );
    await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    await hydrate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo entrar" };
  }
}

export async function cloudLoginEmployee(slug: string, username: string, pin: string): Promise<{ ok: boolean; error?: string }> {
  if (!isCloud || !supabase) return { ok: false, error: "Sin conexión a Supabase" };
  try {
    const data = await callEdge<{ email: string; token_hash: string; expires_in: number }>(
      "employee-login",
      { slug: slug.trim().toLowerCase(), username: username.trim().toLowerCase(), pin },
    );
    const { error } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
    if (error) throw error;
    await hydrate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo entrar" };
  }
}

export async function cloudRegister(input: { name: string; email: string; password: string }): Promise<{ ok: boolean; error?: string }> {
  if (!isCloud || !supabase) return { ok: false, error: "Sin conexión a Supabase" };
  try {
    await callEdge("register-tenant", {
      businessName: input.name.trim(),
      adminName: "Administrador",
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    const { error } = await supabase.auth.signInWithPassword({ email: input.email.trim().toLowerCase(), password: input.password });
    if (error) throw error;
    await hydrate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo crear la cuenta" };
  }
}

export async function hydrate(): Promise<void> {
  if (!isCloud || !supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;

  const { data: member } = await supabase.from("members").select("tenant_id, role, display_name").eq("user_id", user.id).maybeSingle();
  if (!member) return;
  const tenantId = member.tenant_id as string;

  const [
    { data: tenant },
    { data: profile },
    { data: products },
    { data: customers },
    { data: suppliers },
    { data: purchases },
    { data: purchaseLines },
    { data: expenses },
    { data: employees },
    { data: shifts },
    { data: sales },
    { data: saleItems },
    { data: payments },
    { data: audit },
    { data: tools },
    { data: aiSettings },
  ] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle(),
    supabase.from("business_profiles").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("products").select("*").eq("tenant_id", tenantId),
    supabase.from("customers").select("*").eq("tenant_id", tenantId),
    supabase.from("suppliers").select("*").eq("tenant_id", tenantId),
    supabase.from("purchases").select("*").eq("tenant_id", tenantId),
    supabase.from("purchase_lines").select("*").eq("tenant_id", tenantId),
    supabase.from("expenses").select("*").eq("tenant_id", tenantId),
    supabase.from("employees").select("*").eq("tenant_id", tenantId),
    supabase.from("shifts").select("*").eq("tenant_id", tenantId),
    supabase.from("sales").select("*").eq("tenant_id", tenantId),
    supabase.from("sale_items").select("*").eq("tenant_id", tenantId),
    supabase.from("payments").select("*").eq("tenant_id", tenantId),
    supabase.from("audit_log").select("*").eq("tenant_id", tenantId).order("at", { ascending: false }).limit(300),
    supabase.from("tenant_tools").select("*").eq("tenant_id", tenantId),
    supabase.from("ai_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
  ]);

  const db = getDB();
  mutate((d) => {
    d.tenant = tenant
      ? {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          country: tenant.country,
          currency: tenant.currency,
          locale: tenant.locale,
          timezone: tenant.timezone,
          plan: tenant.plan,
          status: tenant.status,
          createdAt: tenant.created_at,
          trialEndsAt: tenant.trial_ends_at ?? undefined,
        }
      : null;
    d.session = { role: member.role === "owner" ? "owner" : member.role === "admin" ? "admin" : "employee", name: member.display_name };
    d.profile = profile
      ? {
          admin: profile.admin ?? { firstName: member.display_name, lastName: "", role: "owner" },
          business: profile.business ?? { name: tenant?.name ?? "", type: "minimarket", size: "small", employees: 0 },
          location: profile.location ?? { country: tenant?.country ?? "CO", city: "", address: "", timezone: tenant?.timezone ?? "America/Bogota" },
          ops: profile.ops ?? { inventory: true, credit: false, delivery: false, paymentMethods: ["Efectivo"], schedule: "" },
        }
      : null;
    d.process = profile?.process ?? null;
    d.setupDone = profile?.setup_done ?? false;
    d.products = (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku ?? "",
      barcode: p.barcode ?? "",
      category: p.category_id ? "" : "",
      price: Number(p.price),
      cost: Number(p.cost),
      stock: Number(p.stock),
      minStock: Number(p.min_stock),
      unit: p.unit,
    }));
    // category name resolution
    const { data: cats } = (supabase as any) ? { data: null } : { data: null };
    d.customers = (customers ?? []).map((c) => ({ id: c.id, name: c.name, phone: c.phone ?? "", creditLimit: Number(c.credit_limit), balance: Number(c.balance), createdAt: c.created_at }));
    d.suppliers = (suppliers ?? []).map((s) => ({ id: s.id, name: s.name, phone: s.phone ?? "", balance: Number(s.balance), lastOrderAt: s.last_order_at ?? undefined }));
    d.expenses = (expenses ?? []).map((e) => ({ id: e.id, at: e.at, category: e.category, amount: Number(e.amount), note: e.note }));
    d.employees = (employees ?? []).map((e) => ({ id: e.id, username: e.username, name: e.name, role: e.role === "supervisor" ? "supervisor" : e.role === "admin" ? "admin" : "cashier", pin: "", active: e.active, createdAt: e.created_at }));
    d.shifts = (shifts ?? []).map((s) => ({ id: s.id, openedAt: s.opened_at, closedAt: s.closed_at ?? undefined, openingFloat: Number(s.opening_float), closingCount: s.closing_count ?? undefined, expected: s.expected ?? undefined, difference: s.difference ?? undefined, cashier: s.cashier_name }));
    const itemsBySale = new Map<string, typeof saleItems>();
    for (const it of saleItems ?? []) {
      const arr = itemsBySale.get(it.sale_id) ?? [];
      arr.push(it);
      itemsBySale.set(it.sale_id, arr);
    }
    const paymentsBySale = new Map<string, typeof payments>();
    for (const pm of payments ?? []) {
      const arr = paymentsBySale.get(pm.sale_id) ?? [];
      arr.push(pm);
      paymentsBySale.set(pm.sale_id, arr);
    }
    d.sales = (sales ?? []).map((s) => ({
      id: s.id,
      folio: s.folio,
      at: s.at,
      items: (itemsBySale.get(s.id) ?? []).map((i) => ({ productId: i.product_id ?? "", name: i.name, qty: Number(i.qty), unitPrice: Number(i.unit_price), taxRate: Number(i.tax_rate), taxAmount: Number(i.tax_amount), total: Number(i.total) })),
      payments: (paymentsBySale.get(s.id) ?? []).map((p) => ({ method: p.method, amount: Number(p.amount) })),
      subtotal: Number(s.subtotal),
      tax: Number(s.tax),
      discount: Number(s.discount),
      total: Number(s.total),
      customerId: s.customer_id ?? undefined,
      shiftId: s.shift_id ?? "",
      cashier: s.cashier,
    }));
    const linesByPurchase = new Map<string, typeof purchaseLines>();
    for (const l of purchaseLines ?? []) {
      const arr = linesByPurchase.get(l.purchase_id) ?? [];
      arr.push(l);
      linesByPurchase.set(l.purchase_id, arr);
    }
    d.purchases = (purchases ?? []).map((p) => ({
      id: p.id,
      folio: p.folio,
      at: p.at,
      supplierId: p.supplier_id ?? "",
      lines: (linesByPurchase.get(p.id) ?? []).map((l) => ({ productId: l.product_id ?? "", name: l.name, qty: Number(l.qty), unitCost: Number(l.unit_cost) })),
      total: Number(p.total),
      status: p.status === "received" ? "received" : "pending",
    }));
    d.audit = (audit ?? []).map((a) => ({ id: String(a.id), at: a.at, actor: a.actor, action: a.action, detail: a.detail }));
    d.tools.pinned = (tools ?? []).filter((t: { pinned: boolean }) => t.pinned).map((t: { tool_key: string }) => t.tool_key);
    d.ai = aiSettings
      ? { provider: (aiSettings.provider as DB["ai"]["provider"]) ?? "google", apiKey: "", model: aiSettings.model ?? "gemini-2.0-flash", enabled: aiSettings.enabled, usedToday: aiSettings.used_today, usedHour: aiSettings.used_hour }
      : d.ai;
  });

  // category names: fetch and patch
  const { data: cats } = await supabase.from("categories").select("id,name").eq("tenant_id", tenantId) as { data: { id: string; name: string }[] | null };
  if (cats) {
    const byId = new Map(cats.map((c) => [c.id, c.name]));
    mutate((d) => {
      for (const p of d.products) {
        // products stored category_id in DB; we lost it in mapping. Re-fetch products with category.
      }
    });
  }
  // Re-fetch products with category join via a second pass
  const { data: prods2 } = await supabase.from("products").select("id, category_id").eq("tenant_id", tenantId) as { data: { id: string; category_id: string | null }[] | null };
  if (prods2 && cats) {
    const byId = new Map(cats.map((c) => [c.id, c.name]));
    const catByProduct = new Map(prods2.map((p) => [p.id, byId.get(p.category_id ?? "") ?? "Otros"]));
    mutate((d) => {
      for (const p of d.products) p.category = catByProduct.get(p.id) ?? p.category;
    });
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSync(): void {
  if (!isCloud) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncAll().catch((e) => console.warn("sync failed", e));
  }, 1500);
}

export async function syncAll(): Promise<void> {
  if (!isCloud || !supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;
  const { data: member } = await supabase.from("members").select("tenant_id").eq("user_id", user.id).maybeSingle();
  if (!member) return;
  const tenantId = member.tenant_id as string;
  const db = getDB();

  await supabase.from("tenants").update({
    name: db.tenant?.name,
    country: db.tenant?.country,
    currency: db.tenant?.currency,
    locale: db.tenant?.locale,
    timezone: db.tenant?.timezone,
    plan: db.tenant?.plan,
    status: db.tenant?.status,
    trial_ends_at: db.tenant?.trialEndsAt ?? null,
  }).eq("id", tenantId);

  if (db.profile) {
    await supabase.from("business_profiles").upsert({
      tenant_id: tenantId,
      admin: db.profile.admin,
      business: db.profile.business,
      location: db.profile.location,
      ops: db.profile.ops,
      process: db.process ?? null,
      setup_done: db.setupDone,
    });
  }

  // products: upsert by id
  if (db.products.length) {
    await supabase.from("products").upsert(
      db.products.map((p) => ({
        id: p.id,
        tenant_id: tenantId,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        unit: p.unit,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        min_stock: p.minStock,
      })),
    );
  }

  if (db.customers.length) {
    await supabase.from("customers").upsert(db.customers.map((c) => ({
      id: c.id, tenant_id: tenantId, name: c.name, phone: c.phone, credit_limit: c.creditLimit, balance: c.balance, created_at: c.createdAt,
    })));
  }

  if (db.suppliers.length) {
    await supabase.from("suppliers").upsert(db.suppliers.map((s) => ({
      id: s.id, tenant_id: tenantId, name: s.name, phone: s.phone, balance: s.balance, last_order_at: s.lastOrderAt ?? null,
    })));
  }

  if (db.expenses.length) {
    await supabase.from("expenses").upsert(db.expenses.map((e) => ({
      id: e.id, tenant_id: tenantId, category: e.category, amount: e.amount, note: e.note, at: e.at,
    })));
  }

  if (db.shifts.length) {
    await supabase.from("shifts").upsert(db.shifts.map((s) => ({
      id: s.id, tenant_id: tenantId, cashier_name: s.cashier, opening_float: s.openingFloat, closing_count: s.closingCount ?? null,
      expected: s.expected ?? null, difference: s.difference ?? null, opened_at: s.openedAt, closed_at: s.closedAt ?? null,
    })));
  }

  if (db.sales.length) {
    await supabase.from("sales").upsert(db.sales.map((s) => ({
      id: s.id, tenant_id: tenantId, shift_id: s.shiftId || null, customer_id: s.customerId ?? null, folio: s.folio,
      subtotal: s.subtotal, tax: s.tax, discount: s.discount, total: s.total, cashier: s.cashier, at: s.at,
    })));
    await supabase.from("sale_items").upsert(db.sales.flatMap((s) => s.items.map((i) => ({
      tenant_id: tenantId, sale_id: s.id, product_id: i.productId || null, name: i.name, qty: i.qty,
      unit_price: i.unitPrice, tax_rate: i.taxRate, tax_amount: i.taxAmount, total: i.total,
    }))));
    await supabase.from("payments").upsert(db.sales.flatMap((s) => s.payments.map((p) => ({
      tenant_id: tenantId, sale_id: s.id, method: p.method, amount: p.amount,
    }))));
  }

  if (db.purchases.length) {
    await supabase.from("purchases").upsert(db.purchases.map((p) => ({
      id: p.id, tenant_id: tenantId, supplier_id: p.supplierId || null, folio: p.folio, status: p.status, total: p.total, at: p.at,
    })));
    await supabase.from("purchase_lines").upsert(db.purchases.flatMap((p) => p.lines.map((l) => ({
      tenant_id: tenantId, purchase_id: p.id, product_id: l.productId || null, name: l.name, qty: l.qty, unit_cost: l.unitCost,
    }))));
  }

  if (db.tools.pinned.length) {
    await supabase.from("tenant_tools").upsert(db.tools.pinned.map((k, i) => ({
      tenant_id: tenantId, tool_key: k, pinned: true, rank: i,
    })));
  }
}
