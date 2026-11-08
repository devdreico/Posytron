import { useSyncExternalStore } from "react";
import type {
  DB, Plan, Product, Sale, SaleLine, Payment, Customer, Supplier, Purchase, Expense, Employee, BusinessProfile, Shift,
} from "./types";
import { demoDB, emptyDB, buildProducts, DEMO_SLUG, DEMO_PASSWORD, slugify } from "./seed";

const KEY = "posytron.db.v1";

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return demoDB();
    const parsed = JSON.parse(raw) as DB;
    if (!parsed || typeof parsed !== "object" || !("tenant" in parsed)) return demoDB();
    return { ...emptyDB(), ...parsed };
  } catch {
    return demoDB();
  }
}

let state: DB = load();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento lleno: seguimos en memoria */
  }
}

export function getDB() {
  return state;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getDB, getDB);
}

export function mutate(fn: (draft: DB) => void) {
  const draft: DB = JSON.parse(JSON.stringify(state));
  fn(draft);
  state = draft;
  persist();
  emit();
  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    import("./cloud").then((m) => m.scheduleSync()).catch(() => {});
  }
}

export function resetAll() {
  state = demoDB();
  persist();
  emit();
}

export function hardReset() {
  state = emptyDB();
  persist();
  emit();
}

export function audit(action: string, detail: string) {
  mutate((d) => {
    d.audit.unshift({
      id: `au_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      at: new Date().toISOString(),
      actor: d.session?.name ?? "sistema",
      action,
      detail,
    });
    d.audit = d.audit.slice(0, 300);
  });
}

/* ---------------- plan ---------------- */

export function effectivePlan(db: DB): Plan {
  if (!db.tenant) return "free";
  if (db.tenant.plan !== "free") return db.tenant.plan;
  if (db.tenant.trialEndsAt && new Date(db.tenant.trialEndsAt).getTime() > Date.now()) return "pro";
  return "free";
}

export function planLimits(plan: Plan) {
  if (plan === "premium") return { employees: 10, ai: true, sell: true };
  if (plan === "pro") return { employees: 3, ai: false, sell: true };
  return { employees: 0, ai: false, sell: false };
}

/* ---------------- auth ---------------- */

export function loginOwner(slug: string, password: string, code: string): { ok: boolean; error?: string } {
  const normalized = slugify(slug);
  const db = state;
  if (!db.tenant) {
    return { ok: false, error: "Nombre de negocio o credenciales incorrectas" };
  }
  const matches = db.tenant.slug === normalized;
  const passOk = password === DEMO_PASSWORD || password === "demo";
  if (!matches || !passOk) {
    return { ok: false, error: "Nombre de negocio o credenciales incorrectas" };
  }
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "El código debe tener 6 dígitos" };
  }
  mutate((d) => {
    d.session = { role: "owner", name: d.profile?.admin.firstName ?? "Administrador" };
  });
  return { ok: true };
}

export function loginEmployee(slug: string, username: string, pin: string): { ok: boolean; error?: string } {
  const db = state;
  if (!db.tenant || db.tenant.slug !== slugify(slug)) {
    return { ok: false, error: "Nombre de negocio o credenciales incorrectas" };
  }
  const emp = db.employees.find((e) => e.username === username.trim().toLowerCase() && e.active);
  if (!emp || emp.pin !== pin) {
    return { ok: false, error: "Usuario o PIN incorrecto" };
  }
  mutate((d) => {
    d.session = { role: "employee", name: emp.name, employeeId: emp.id };
  });
  return { ok: true };
}

export function logout() {
  mutate((d) => {
    d.session = null;
  });
}

export function register(input: { name: string; email: string; password: string }): { ok: boolean; error?: string } {
  if (!input.name.trim()) return { ok: false, error: "Escribe el nombre de tu negocio" };
  if (input.password.length < 10) return { ok: false, error: "La contraseña necesita al menos 10 caracteres" };
  mutate((d) => {
    d.tenant = {
      id: `tn_${Date.now()}`,
      slug: slugify(input.name) || `negocio-${Math.floor(Math.random() * 9999)}`,
      name: input.name.trim(),
      country: "CO",
      currency: "COP",
      locale: "es-CO",
      timezone: "America/Bogota",
      plan: "free",
      status: "onboarding_pending",
      createdAt: new Date().toISOString(),
      trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    };
    d.session = { role: "owner", name: "Administrador" };
    d.products = [];
    d.sales = [];
    d.customers = [];
    d.suppliers = [];
    d.purchases = [];
    d.expenses = [];
    d.shifts = [];
    d.employees = [];
    d.profile = null;
    d.process = null;
    d.setupDone = false;
  });
  return { ok: true };
}

export function completeOnboarding(profile: BusinessProfile) {
  mutate((d) => {
    if (!d.tenant) return;
    d.profile = profile;
    d.tenant.name = profile.business.name;
    d.tenant.slug = slugify(profile.business.name) || d.tenant.slug;
    d.tenant.country = profile.location.country;
    d.tenant.timezone = profile.location.timezone;
    d.tenant.status = "setup_running";
    d.session = { role: "owner", name: profile.admin.firstName || "Administrador" };
  });
}

export function runSetup() {
  mutate((d) => {
    if (!d.tenant) return;
    if (d.products.length === 0) d.products = buildProducts(12);
    if (d.employees.length === 0) {
      d.employees = [
        {
          id: `em_${Date.now()}`,
          username: "cajero1",
          name: "Cajero 1",
          role: "cashier",
          pin: "1234",
          active: true,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    d.tenant.status = "active";
    d.setupDone = true;
    d.tools.pinned = [
      "caja.apertura_de_caja_con_base",
      "caja.venta_rapida_por_teclado",
      "inventario.alta_de_producto",
      "inventario.productos_bajo_minimo",
      "clientes.alta_de_cliente",
      "finanzas.registro_de_gasto",
      "reportes.reporte_de_ventas_por_dia",
      "admin.datos_del_negocio",
    ];
  });
}

/* ---------------- ventas ---------------- */

export function openShift(openingFloat: number): Shift | null {
  const db = state;
  if (!db.tenant) return null;
  if (db.shifts.some((s) => !s.closedAt)) return null;
  const shift = {
    id: `sh_${Date.now()}`,
    openedAt: new Date().toISOString(),
    openingFloat,
    cashier: db.session?.name ?? "Cajero",
  };
  mutate((d) => {
    d.shifts.unshift(shift);
  });
  return shift;
}

export function closeShift(closingCount: number) {
  mutate((d) => {
    const shift = d.shifts.find((s) => !s.closedAt);
    if (!shift) return;
    const cashSales = d.sales
      .filter((s) => s.shiftId === shift.id && s.payments.some((p) => p.method === "Efectivo"))
      .reduce((a, s) => a + s.total, 0);
    const expected = shift.openingFloat + cashSales;
    shift.closedAt = new Date().toISOString();
    shift.closingCount = closingCount;
    shift.expected = expected;
    shift.difference = closingCount - expected;
  });
}

export function currentShift(db: DB = state) {
  return db.shifts.find((s) => !s.closedAt) ?? null;
}

export function sell(items: SaleLine[], payments: Payment[], customerId?: string): { ok: boolean; error?: string; sale?: Sale } {
  const db = state;
  const plan = effectivePlan(db);
  if (!planLimits(plan).sell) {
    return { ok: false, error: "Tu plan Free no permite vender. Activa Pro para empezar." };
  }
  const shift = currentShift(db);
  if (!shift) return { ok: false, error: "No hay caja abierta. Abre un turno primero." };
  if (items.length === 0) return { ok: false, error: "La venta está vacía." };

  const total = items.reduce((a, i) => a + i.total, 0);
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  if (paid < total) return { ok: false, error: "El pago no cubre el total." };

  const tax = items.reduce((a, i) => a + i.taxAmount, 0);
  const sale: Sale = {
    id: `sa_${Date.now()}`,
    folio: `V-${1000 + db.sales.length + 1}`,
    at: new Date().toISOString(),
    items,
    payments,
    subtotal: total - tax,
    tax,
    discount: 0,
    total,
    customerId,
    shiftId: shift.id,
    cashier: db.session?.name ?? "Cajero",
  };

  mutate((d) => {
    d.sales.unshift(sale);
    for (const line of items) {
      const p = d.products.find((x) => x.id === line.productId);
      if (p) p.stock = Math.max(0, p.stock - line.qty);
    }
    if (customerId) {
      const c = d.customers.find((x) => x.id === customerId);
      const credit = payments.find((p) => p.method === "Crédito");
      if (c && credit) {
        c.balance += credit.amount;
      }
    }
  });
  audit("venta.registrada", `${sale.folio} por ${total} cts`);
  return { ok: true, sale };
}

/* ---------------- catálogo ---------------- */

export function addProduct(p: Omit<Product, "id">) {
  mutate((d) => {
    d.products.unshift({ ...p, id: `pr_${Date.now()}` });
  });
  audit("producto.creado", p.name);
}

export function updateProduct(id: string, patch: Partial<Product>) {
  mutate((d) => {
    const p = d.products.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
  });
  audit("producto.actualizado", id);
}

export function adjustStock(id: string, delta: number, reason = "ajuste") {
  mutate((d) => {
    const p = d.products.find((x) => x.id === id);
    if (p) p.stock = Math.max(0, p.stock + delta);
  });
  audit("inventario.ajuste", `${id} ${delta > 0 ? "+" : ""}${delta} (${reason})`);
}

/* ---------------- entidades ---------------- */

export function addCustomer(c: Omit<Customer, "id" | "createdAt" | "balance">) {
  mutate((d) => {
    d.customers.unshift({ ...c, id: `cu_${Date.now()}`, balance: 0, createdAt: new Date().toISOString() });
  });
  audit("cliente.creado", c.name);
}

export function payCustomer(id: string, amount: number) {
  mutate((d) => {
    const c = d.customers.find((x) => x.id === id);
    if (c) c.balance = Math.max(0, c.balance - amount);
  });
  audit("cliente.abono", `${id} ${amount} cts`);
}

export function addSupplier(s: Omit<Supplier, "id">) {
  mutate((d) => {
    d.suppliers.unshift({ ...s, id: `su_${Date.now()}` });
  });
  audit("proveedor.creado", s.name);
}

export function addPurchase(p: Omit<Purchase, "id" | "folio" | "at" | "status">) {
  mutate((d) => {
    d.purchases.unshift({
      ...p,
      id: `pu_${Date.now()}`,
      folio: `C-${200 + d.purchases.length + 1}`,
      at: new Date().toISOString(),
      status: "pending",
    });
  });
  audit("compra.creada", p.supplierId);
}

export function receivePurchase(id: string) {
  mutate((d) => {
    const pur = d.purchases.find((x) => x.id === id);
    if (!pur || pur.status === "received") return;
    pur.status = "received";
    for (const line of pur.lines) {
      const p = d.products.find((x) => x.id === line.productId);
      if (p) {
        const newStock = p.stock + line.qty;
        p.cost = Math.round((p.cost * p.stock + line.unitCost * line.qty) / Math.max(1, newStock));
        p.stock = newStock;
      }
    }
  });
  audit("compra.recibida", id);
}

export function addExpense(e: Omit<Expense, "id" | "at">) {
  mutate((d) => {
    d.expenses.unshift({ ...e, id: `ex_${Date.now()}`, at: new Date().toISOString() });
  });
  audit("gasto.registrado", `${e.category} ${e.amount}`);
}

export function inviteEmployee(e: Omit<Employee, "id" | "createdAt" | "active">): { ok: boolean; error?: string } {
  const db = state;
  const plan = effectivePlan(db);
  const limit = planLimits(plan).employees;
  if (db.employees.length >= limit) {
    return { ok: false, error: `Tu plan permite ${limit} empleados. Mejora el plan para agregar más.` };
  }
  if (db.employees.some((x) => x.username === e.username)) {
    return { ok: false, error: "Ese usuario ya existe" };
  }
  mutate((d) => {
    d.employees.push({ ...e, id: `em_${Date.now()}`, active: true, createdAt: new Date().toISOString() });
  });
  audit("empleado.invitado", e.username);
  return { ok: true };
}

export function toggleEmployee(id: string) {
  mutate((d) => {
    const e = d.employees.find((x) => x.id === id);
    if (e) e.active = !e.active;
  });
}

export function setPlan(plan: Plan) {
  mutate((d) => {
    if (!d.tenant) return;
    d.tenant.plan = plan;
    d.tenant.trialEndsAt = undefined;
  });
  audit("plan.cambiado", plan);
}

export function setAi(patch: Partial<DB["ai"]>) {
  mutate((d) => {
    d.ai = { ...d.ai, ...patch };
  });
}

export function pushAiMessage(role: "user" | "assistant", content: string, tool?: string) {
  mutate((d) => {
    d.aiMessages.push({ role, content, at: new Date().toISOString(), tool });
    d.aiMessages = d.aiMessages.slice(-60);
  });
}

/* ---------------- métricas ---------------- */

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function metrics(db: DB = state) {
  const today = startOfDay();
  const todaySales = db.sales.filter((s) => new Date(s.at) >= today);
  const todayTotal = todaySales.reduce((a, s) => a + s.total, 0);
  const lowStock = db.products.filter((p) => p.stock <= p.minStock);
  const receivables = db.customers.reduce((a, c) => a + c.balance, 0);
  const payables = db.suppliers.reduce((a, s) => a + s.balance, 0);
  const stockValue = db.products.reduce((a, p) => a + p.stock * p.cost, 0);
  const weekStart = new Date(Date.now() - 7 * 86400000);
  const weekSales = db.sales.filter((s) => new Date(s.at) >= weekStart);
  const weekTotal = weekSales.reduce((a, s) => a + s.total, 0);
  const ticket = weekSales.length ? Math.round(weekTotal / weekSales.length) : 0;

  const cost = weekSales.reduce(
    (a, s) =>
      a +
      s.items.reduce((b, i) => {
        const p = db.products.find((x) => x.id === i.productId);
        return b + (p ? p.cost * i.qty : 0);
      }, 0),
    0
  );
  const grossMargin = weekTotal ? Math.round(((weekTotal - cost) / weekTotal) * 100) : 0;
  const monthExpenses = db.expenses
    .filter((e) => new Date(e.at).getMonth() === new Date().getMonth())
    .reduce((a, e) => a + e.amount, 0);

  return {
    todayTotal,
    todayCount: todaySales.length,
    lowStock,
    receivables,
    payables,
    stockValue,
    weekTotal,
    ticket,
    grossMargin,
    monthExpenses,
    openShift: currentShift(db),
  };
}

export function salesByDay(db: DB = state, days = 7) {
  const out: { day: string; label: string; total: number; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(new Date(Date.now() - i * 86400000));
    const next = new Date(d.getTime() + 86400000);
    const items = db.sales.filter((s) => {
      const at = new Date(s.at);
      return at >= d && at < next;
    });
    out.push({
      day: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("es-CO", { weekday: "short" }),
      total: items.reduce((a, s) => a + s.total, 0),
      count: items.length,
    });
  }
  return out;
}

export function topProducts(db: DB = state, limit = 5) {
  const map = new Map<string, { name: string; qty: number; total: number }>();
  for (const s of db.sales) {
    for (const i of s.items) {
      const cur = map.get(i.productId) ?? { name: i.name, qty: 0, total: 0 };
      cur.qty += i.qty;
      cur.total += i.total;
      map.set(i.productId, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export { DEMO_SLUG, DEMO_PASSWORD };
