import type { DB, Product, Sale, Customer, Supplier, Purchase, Expense, Employee } from "./types";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATS = ["Abarrotes", "Lácteos", "Bebidas", "Snacks", "Aseo", "Ferretería"];

const RAW_PRODUCTS: [string, string, number, number, number][] = [
  ["Arroz Diana 500 g", "Abarrotes", 320000, 220000, 40],
  ["Aceite Girasol 1 L", "Abarrotes", 890000, 640000, 18],
  ["Panela 1 kg", "Abarrotes", 450000, 310000, 25],
  ["Café Águila 500 g", "Abarrotes", 1250000, 920000, 12],
  ["Azúcar 1 kg", "Abarrotes", 420000, 290000, 30],
  ["Sal 500 g", "Abarrotes", 180000, 110000, 22],
  ["Leche Alquería 1 L", "Lácteos", 390000, 285000, 24],
  ["Huevos AA x12", "Lácteos", 980000, 710000, 15],
  ["Pan tajado 500 g", "Lácteos", 450000, 320000, 9],
  ["Queso campesino 250 g", "Lácteos", 680000, 490000, 7],
  ["Gaseosa Coca-Cola 1.5 L", "Bebidas", 650000, 480000, 20],
  ["Agua Cristal 600 ml", "Bebidas", 180000, 110000, 36],
  ["Jugo Hit 500 ml", "Bebidas", 250000, 170000, 18],
  ["Cerveza Águila 330 ml", "Bebidas", 320000, 230000, 48],
  ["Papas Margarita 105 g", "Snacks", 430000, 310000, 16],
  ["Chocorramo", "Snacks", 220000, 150000, 20],
  ["Galletas Festival", "Snacks", 120000, 80000, 30],
  ["Chocolatina Jet", "Snacks", 90000, 55000, 34],
  ["Detergente Fab 900 g", "Aseo", 890000, 660000, 10],
  ["Jabón Rey 900 g", "Aseo", 520000, 370000, 14],
  ["Papel higiénico x4", "Aseo", 780000, 560000, 11],
  ["Shampoo Sedal 340 ml", "Aseo", 950000, 700000, 8],
  ["Crema dental Colgate", "Aseo", 720000, 520000, 6],
  ["Pilas AA x2", "Ferretería", 450000, 300000, 13],
  ["Bombillo LED 9 W", "Ferretería", 680000, 450000, 9],
  ["Escoba plástica", "Ferretería", 750000, 520000, 5],
  ["Bolsas basura x10", "Ferretería", 320000, 200000, 17],
];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");

export function buildProducts(count = RAW_PRODUCTS.length): Product[] {
  return RAW_PRODUCTS.slice(0, count).map(([name, category, price, cost, stock], i) => ({
    id: `pr_${String(i + 1).padStart(3, "0")}`,
    name,
    sku: `SKU-${String(i + 1).padStart(3, "0")}`,
    barcode: `77${String(100000 + i * 137).slice(0, 7)}`,
    category,
    price,
    cost,
    stock,
    minStock: Math.max(3, Math.round(stock * 0.35)),
    unit: "un",
  }));
}

function buildSales(products: Product[], shiftId: string): Sale[] {
  const rand = rng(42);
  const sales: Sale[] = [];
  const now = Date.now();
  for (let d = 6; d >= 0; d--) {
    const perDay = 6 + Math.floor(rand() * 7);
    for (let s = 0; s < perDay; s++) {
      const at = new Date(now - d * 86400000);
      at.setHours(8 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0);
      const nItems = 1 + Math.floor(rand() * 3);
      const items = [];
      let subtotal = 0;
      for (let k = 0; k < nItems; k++) {
        const p = products[Math.floor(rand() * products.length)];
        const qty = 1 + Math.floor(rand() * 3);
        const total = p.price * qty;
        subtotal += total;
        items.push({
          productId: p.id,
          name: p.name,
          qty,
          unitPrice: p.price,
          taxRate: 0.19,
          taxAmount: Math.round((total * 0.19) / 1.19),
          total,
        });
      }
      const tax = items.reduce((a, i) => a + i.taxAmount, 0);
      const method = rand() > 0.55 ? "Efectivo" : "Tarjeta";
      sales.push({
        id: `sa_${d}_${s}_${Math.floor(rand() * 9999)}`,
        folio: `V-${String(1000 + sales.length)}`,
        at: at.toISOString(),
        items,
        payments: [{ method, amount: subtotal }],
        subtotal: subtotal - tax,
        tax,
        discount: 0,
        total: subtotal,
        shiftId,
        cashier: "María Gómez",
      });
    }
  }
  return sales;
}

const CUSTOMERS: Customer[] = [
  ["Doña Rosa Pérez", "300 123 4567", 300000, 450000],
  ["Carlos Ramírez", "311 555 0102", 200000, 120000],
  ["Tienda La Esquina", "320 888 7766", 800000, 0],
  ["Andrea López", "301 444 3322", 150000, 89000],
  ["Don Jorge Ruiz", "315 222 1100", 500000, 610000],
  ["Familia Torres", "310 999 8877", 250000, 0],
].map(([name, phone, limit, balance], i) => ({
  id: `cu_${i + 1}`,
  name: name as string,
  phone: phone as string,
  creditLimit: limit as number,
  balance: balance as number,
  createdAt: new Date(Date.now() - (60 - i * 7) * 86400000).toISOString(),
}));

const SUPPLIERS: Supplier[] = [
  ["Distribuidora Andina", "601 555 0001", 1850000],
  ["Lácteos del Valle", "602 555 4412", 640000],
  ["Gaseosas del Norte", "605 555 9933", 0],
  ["Aseo Total S.A.S.", "601 555 7788", 320000],
].map(([name, phone, balance], i) => ({
  id: `su_${i + 1}`,
  name: name as string,
  phone: phone as string,
  balance: balance as number,
  lastOrderAt: new Date(Date.now() - (3 + i * 5) * 86400000).toISOString(),
}));

function buildPurchases(products: Product[]): Purchase[] {
  return [0, 1, 2].map((i) => {
    const lines = [0, 1, 2].map((k) => {
      const p = products[(i * 7 + k * 3) % products.length];
      const qty = 10 + k * 5;
      return { productId: p.id, name: p.name, qty, unitCost: p.cost };
    });
    return {
      id: `pu_${i + 1}`,
      folio: `C-${200 + i}`,
      at: new Date(Date.now() - (4 + i * 9) * 86400000).toISOString(),
      supplierId: `su_${(i % 4) + 1}`,
      lines,
      total: lines.reduce((a, l) => a + l.qty * l.unitCost, 0),
      status: i === 0 ? "pending" : "received",
    };
  });
}

const EXPENSES: Expense[] = [
  ["Arriendo", 1800000, "Local principal"],
  ["Servicios", 320000, "Luz y agua"],
  ["Nómina", 2400000, "Pago quincenal"],
  ["Transporte", 180000, "Domicilios y compras"],
  ["Papelería", 45000, "Tirillas y bolsas"],
  ["Mantenimiento", 210000, "Aire acondicionado"],
].map(([category, amount, note], i) => ({
  id: `ex_${i + 1}`,
  at: new Date(Date.now() - (2 + i * 4) * 86400000).toISOString(),
  category: category as string,
  amount: amount as number,
  note: note as string,
}));

const EMPLOYEES: Employee[] = [
  {
    id: "em_1",
    username: "maria",
    name: "María Gómez",
    role: "cashier",
    pin: "1234",
    active: true,
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: "em_2",
    username: "carlos",
    name: "Carlos Ramírez",
    role: "supervisor",
    pin: "2468",
    active: true,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

export const DEMO_SLUG = "minimarket-ana";
export const DEMO_PASSWORD = "posytron2026";

export function emptyDB(): DB {
  return {
    tenant: null,
    session: null,
    profile: null,
    process: null,
    products: [],
    sales: [],
    customers: [],
    suppliers: [],
    purchases: [],
    expenses: [],
    shifts: [],
    employees: [],
    tools: { pinned: [], lastUsed: [] },
    ai: { provider: "google", apiKey: "", model: "gemini-2.0-flash", enabled: false, usedToday: 0, usedHour: 0 },
    aiMessages: [],
    audit: [],
    setupDone: false,
  };
}

export function demoDB(): DB {
  const products = buildProducts();
  const shiftId = "sh_1";
  const db = emptyDB();
  db.tenant = {
    id: "tn_demo",
    slug: DEMO_SLUG,
    name: "Minimarket Ana",
    country: "CO",
    currency: "COP",
    locale: "es-CO",
    timezone: "America/Bogota",
    plan: "premium",
    status: "active",
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  };
  db.profile = {
    admin: { firstName: "Ana", lastName: "Restrepo", role: "owner" },
    business: { name: "Minimarket Ana", type: "minimarket", size: "small", employees: 3 },
    location: { country: "CO", city: "Medellín", address: "Calle 45 #23-12", timezone: "America/Bogota" },
    ops: {
      inventory: true,
      credit: true,
      delivery: false,
      paymentMethods: ["Efectivo", "Tarjeta", "Transferencia"],
      schedule: "Lun a sáb, 7:00 – 21:00",
    },
  };
  db.products = products;
  db.customers = CUSTOMERS;
  db.suppliers = SUPPLIERS;
  db.purchases = buildPurchases(products);
  db.expenses = EXPENSES;
  db.employees = EMPLOYEES;
  db.shifts = [
    {
      id: shiftId,
      openedAt: new Date(new Date().setHours(7, 30, 0, 0)).toISOString(),
      openingFloat: 150000,
      cashier: "María Gómez",
    },
  ];
  db.sales = buildSales(products, shiftId);
  db.tools.pinned = [
    "caja.cierre_de_turno_con_arqueo",
    "caja.venta_rapida_por_teclado",
    "inventario.productos_bajo_minimo",
    "inventario.importacion_de_productos_por_csv",
    "compras.orden_sugerida_por_rotacion",
    "clientes.clientes_en_mora",
    "finanzas.punto_de_equilibrio",
    "reportes.reporte_de_ventas_por_dia",
    "automatizaciones.reposicion_automatica_por_minimo",
    "marketing.plantilla_de_whatsapp",
    "equipo.ranking_de_vendedores",
    "admin.plan_y_facturación",
  ];
  db.ai.enabled = true;
  db.setupDone = true;
  return db;
}

export function makeTenantFromProfile(p: {
  name: string;
  type: string;
  country: string;
  city: string;
  timezone?: string;
}) {
  return {
    id: `tn_${Date.now()}`,
    slug: slugify(p.name) || `negocio-${Math.floor(Math.random() * 9999)}`,
    name: p.name,
    country: p.country,
    currency: p.country === "MX" ? "MXN" : p.country === "PE" ? "PEN" : p.country === "CL" ? "CLP" : "COP",
    locale: p.country === "MX" ? "es-MX" : p.country === "PE" ? "es-PE" : p.country === "CL" ? "es-CL" : "es-CO",
    timezone: p.timezone ?? "America/Bogota",
    plan: "free" as const,
    status: "onboarding_pending" as const,
    createdAt: new Date().toISOString(),
    trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
  };
}

export { slugify, CATS };
