import type { DB, Tool } from "./types";
import { metrics, topProducts, salesByDay, effectivePlan } from "./store";
import { money, num, date } from "./format";

export interface TableResult {
  kind: "table";
  columns: string[];
  rows: (string | number)[][];
  note?: string;
}

export interface TextResult {
  kind: "text";
  text: string;
}

export type ToolResult = TableResult | TextResult;

const norm = (s: string) => s.toLowerCase();

export function runTool(tool: Tool, db: DB): ToolResult {
  const m = metrics(db);
  const name = norm(tool.name);
  const cur = db.tenant?.currency ?? "COP";

  if (tool.category === "reportes" || /^reporte/.test(name)) {
    return reportFor(name, db, cur);
  }

  if (/producto|inventario|stock|kardex|etiqueta|conteo|merma|variante/.test(name)) {
    return {
      kind: "table",
      columns: ["Producto", "Categoría", "Stock", "Mínimo", "Costo", "Precio"],
      rows: db.products
        .slice(0, 25)
        .map((p) => [p.name, p.category, p.stock, p.minStock, money(p.cost, cur), money(p.price, cur)]),
      note: `${db.products.length} productos en catálogo · ${m.lowStock.length} bajo mínimo`,
    };
  }

  if (/cliente|mora|cartera|cupo|abono|cobranza|rfm|ranking de clientes/.test(name)) {
    return {
      kind: "table",
      columns: ["Cliente", "Teléfono", "Cupo", "Saldo"],
      rows: db.customers.slice(0, 25).map((c) => [c.name, c.phone, money(c.creditLimit, cur), money(c.balance, cur)]),
      note: `Cartera total: ${money(m.receivables, cur)}`,
    };
  }

  if (/proveedor|compra|pagar|orden/.test(name)) {
    return {
      kind: "table",
      columns: ["Proveedor", "Teléfono", "Saldo", "Última orden"],
      rows: db.suppliers.slice(0, 25).map((s) => [s.name, s.phone, money(s.balance, cur), s.lastOrderAt ? date(s.lastOrderAt) : "—"]),
      note: `Por pagar: ${money(m.payables, cur)}`,
    };
  }

  if (/gasto|utilidad|margen|equilibrio|flujo|presupuesto|impuesto|contable/.test(name)) {
    return {
      kind: "table",
      columns: ["Indicador", "Valor"],
      rows: [
        ["Ventas últimos 7 días", money(m.weekTotal, cur)],
        ["Margen bruto", `${m.grossMargin}%`],
        ["Gastos del mes", money(m.monthExpenses, cur)],
        ["Cartera por cobrar", money(m.receivables, cur)],
        ["Por pagar", money(m.payables, cur)],
        ["Valor del inventario", money(m.stockValue, cur)],
      ],
    };
  }

  if (tool.category === "caja") {
    const rows = db.sales.slice(0, 25).map((s) => [
      s.folio,
      date(s.at),
      s.items.length,
      s.payments.map((p) => p.method).join(" + "),
      money(s.total, cur),
    ]);
    return { kind: "table", columns: ["Folio", "Fecha", "Ítems", "Pago", "Total"], rows, note: `Ventas de hoy: ${money(m.todayTotal, cur)}` };
  }

  if (tool.category === "automatizaciones") {
    return {
      kind: "text",
      text: `«${tool.name}» queda activa. Revisa los eventos disparados en el registro de auditoría. Condición base: ${db.products.length} productos y ${db.customers.length} clientes monitoreados.`,
    };
  }

  if (tool.category === "equipo") {
    return {
      kind: "table",
      columns: ["Empleado", "Usuario", "Rol", "Estado"],
      rows: db.employees.map((e) => [e.name, e.username, e.role, e.active ? "Activo" : "Bloqueado"]),
      note: `Plan ${effectivePlan(db)} · límite ${effectivePlan(db) === "premium" ? 10 : effectivePlan(db) === "pro" ? 3 : 0} empleados`,
    };
  }

  if (tool.category === "integraciones") {
    return {
      kind: "text",
      text: `«${tool.name}» requiere conexión con Supabase para ejecutarse en producción. En esta versión local el conector queda registrado y visible para configuración.`,
    };
  }

  if (tool.category === "admin") {
    return {
      kind: "table",
      columns: ["Dato", "Valor"],
      rows: [
        ["Negocio", db.tenant?.name ?? "—"],
        ["Slug", db.tenant?.slug ?? "—"],
        ["Plan", effectivePlan(db)],
        ["País", db.tenant?.country ?? "—"],
        ["Moneda", db.tenant?.currency ?? "—"],
        ["Sucursales", "1"],
        ["Empleados", String(db.employees.length)],
      ],
    };
  }

  return {
    kind: "table",
    columns: ["Indicador", "Valor"],
    rows: [
      ["Ventas de hoy", money(m.todayTotal, cur)],
      ["Transacciones hoy", num(m.todayCount)],
      ["Ticket promedio (7d)", money(m.ticket, cur)],
      ["Productos bajo mínimo", String(m.lowStock.length)],
      ["Cartera", money(m.receivables, cur)],
      ["Top producto", topProducts(db, 1)[0]?.name ?? "—"],
    ],
  };
}

function reportFor(name: string, db: DB, cur: string): ToolResult {
  if (name.includes("por día") || name.includes("por dia")) {
    return {
      kind: "table",
      columns: ["Día", "Ventas", "Transacciones"],
      rows: salesByDay(db, 7).map((d) => [d.label, money(d.total, cur), d.count]),
    };
  }
  if (name.includes("por categoría") || name.includes("por categoria")) {
    const map = new Map<string, number>();
    for (const s of db.sales) {
      for (const i of s.items) {
        const p = db.products.find((x) => x.id === i.productId);
        const key = p?.category ?? "Otros";
        map.set(key, (map.get(key) ?? 0) + i.total);
      }
    }
    return {
      kind: "table",
      columns: ["Categoría", "Ventas"],
      rows: [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, money(v, cur)]),
    };
  }
  if (name.includes("por producto")) {
    return {
      kind: "table",
      columns: ["Producto", "Unidades", "Ventas"],
      rows: topProducts(db, 10).map((p) => [p.name, p.qty, money(p.total, cur)]),
    };
  }
  if (name.includes("por sucursal")) {
    const total = db.sales.reduce((a, s) => a + s.total, 0);
    return {
      kind: "table",
      columns: ["Sucursal", "Ventas", "Participación"],
      rows: [[db.tenant?.name ?? "Principal", money(total, cur), "100%"]],
    };
  }
  if (name.includes("gastos")) {
    return {
      kind: "table",
      columns: ["Categoría", "Monto"],
      rows: Object.entries(
        db.expenses.reduce<Record<string, number>>((acc, e) => {
          acc[e.category] = (acc[e.category] ?? 0) + e.amount;
          return acc;
        }, {})
      ).map(([k, v]) => [k, money(v, cur)]),
    };
  }
  if (name.includes("cartera")) {
    return {
      kind: "table",
      columns: ["Cliente", "Saldo"],
      rows: db.customers.filter((c) => c.balance > 0).map((c) => [c.name, money(c.balance, cur)]),
    };
  }
  if (name.includes("quiebre")) {
    return {
      kind: "table",
      columns: ["Producto", "Stock", "Mínimo"],
      rows: db.products.filter((p) => p.stock <= p.minStock).map((p) => [p.name, p.stock, p.minStock]),
    };
  }
  return {
    kind: "table",
    columns: ["Indicador", "Valor"],
    rows: [
      ["Ventas 7 días", money(metrics(db).weekTotal, cur)],
      ["Margen bruto", `${metrics(db).grossMargin}%`],
      ["Ticket promedio", money(metrics(db).ticket, cur)],
    ],
  };
}
