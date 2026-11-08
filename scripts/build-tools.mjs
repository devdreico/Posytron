// Genera el catálogo de 400 herramientas a partir de definiciones curadas.
// Salida: apps/web/src/lib/tools.ts y supabase/seed/tools.json
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CATEGORIES = {
  caja: {
    verticals: ["retail", "restaurante", "farmacia", "servicios", "ferreteria", "panaderia", "licoreria", "cafeteria"],
    names: [
      "Apertura de caja con base", "Cierre de turno con arqueo", "Cierre ciego de caja",
      "Arqueo por denominación", "Retiro parcial de efectivo", "Ingreso de efectivo a caja",
      "Anulación de venta", "Devolución total", "Devolución parcial", "Venta rápida por teclado",
      "Venta en espera", "Recuperar venta en espera", "División de pago en dos medios",
      "Cobro mixto efectivo y tarjeta", "Descuento por línea", "Descuento por total",
      "Cupón manual", "Reimpresión de tirilla", "Envío de tirilla por WhatsApp",
      "Envío de tirilla por correo", "Apertura de cajón monedero", "Prueba de impresora",
      "Ventas del turno", "Ventas por cajero", "Ventas por método de pago", "Propinas",
      "Redondeo de efectivo", "Factura interna", "Nota de crédito interna",
      "Registro de gasto desde caja", "Pago a proveedor desde caja", "Cambio de turno sin cierre",
      "Auditoría de diferencias", "Límite de descuento por rol", "Autorización de supervisor",
      "Conteo de caja rápido", "Historial de arqueos", "Caja por sucursal",
      "Comparativo de turnos", "Ventas por hora", "Ticket promedio del turno",
      "Productos más vendidos del turno", "Ventas anuladas del día", "Control de cajón abierto",
      "Cierre con resumen por correo",
    ],
  },
  inventario: {
    verticals: ["retail", "farmacia", "ferreteria", "panaderia", "licoreria"],
    names: [
      "Alta de producto", "Edición de producto", "Baja lógica de producto",
      "Importación de productos por CSV", "Exportación de catálogo", "Generación de código de barras",
      "Impresión de etiquetas", "Ajuste positivo de stock", "Ajuste negativo de stock",
      "Conteo cíclico", "Conteo total", "Transferencia entre sucursales", "Traslado a bodega",
      "Merma y desperdicio", "Producto dañado", "Reactivación de producto", "Variantes de producto",
      "Unidades de medida", "Precio por sucursal", "Costo promedio ponderado",
      "Historial de movimientos", "Kardex por producto", "Productos bajo mínimo",
      "Sugerencia de reposición", "Rotación por producto", "Días de inventario",
      "Inventario valorizado", "Inventario por categoría", "Búsqueda por escáner",
      "Búsqueda por nombre", "Productos sin movimiento", "Productos sin código",
      "Duplicados de código de barras", "Combos y kits", "Productos a granel",
      "Control de lotes", "Fechas de vencimiento", "Alertas de vencimiento",
      "Seriales y garantías", "Ubicación en estante", "Etiquetas por categoría",
      "Actualización masiva de precios", "Actualización masiva de costos",
      "Stock mínimo por sucursal", "Conciliación de inventario",
    ],
  },
  compras: {
    verticals: ["retail", "farmacia", "ferreteria", "restaurante", "panaderia"],
    names: [
      "Orden de compra", "Recepción total de orden", "Recepción parcial", "Recepción sin orden",
      "Devolución a proveedor", "Alta de proveedor", "Edición de proveedor", "Baja de proveedor",
      "Directorio de proveedores", "Comparador de proveedores", "Precio histórico por proveedor",
      "Orden sugerida por rotación", "Orden sugerida por mínimo", "Costo de última compra",
      "Actualización de costos", "Cuentas por pagar", "Pago a proveedor", "Abono a proveedor",
      "Anticipo a proveedor", "Nota de crédito de proveedor", "Factura de compra",
      "Importación de factura", "Lectura de factura por foto", "Gasto de flete",
      "Costo adicional de importación", "Tiempo de entrega por proveedor",
      "Cumplimiento de proveedor", "Proveedores inactivos", "Compras del mes",
      "Compras por categoría", "Rotación de compras", "Margen después de compra",
      "Alerta de sobrestock", "Alerta de quiebre", "Sugerencia de cantidad óptima",
      "Lote económico de compra", "Punto de reorden", "Contratos y condiciones",
      "Evaluación de proveedor", "Exportación de compras",
    ],
  },
  clientes: {
    verticals: ["retail", "restaurante", "servicios", "farmacia", "ferreteria"],
    names: [
      "Alta de cliente", "Edición de cliente", "Baja de cliente", "Búsqueda por teléfono",
      "Historial de compras", "Frecuencia de compra", "Última compra",
      "Ticket promedio del cliente", "Cupo de crédito", "Ajuste de cupo", "Venta a crédito",
      "Abono de cliente", "Estado de cuenta", "Cobranza del día", "Clientes en mora",
      "Antigüedad de cartera", "Recordatorio de pago", "Segmentación RFM",
      "Clientes nuevos del mes", "Clientes inactivos", "Clientes frecuentes",
      "Clientes por categoría", "Cumpleaños del mes", "Programa de puntos", "Canje de puntos",
      "Cupón de bienvenida", "Cupón de cumpleaños", "Cupón de reactivación",
      "Lista de precios por cliente", "Descuento permanente", "Cliente mayorista",
      "Datos de facturación", "Consentimiento de datos", "Exportación de clientes",
      "Importación de clientes", "Fusión de clientes duplicados", "Notas por cliente",
      "Etiquetas de cliente", "Cliente sin compras", "Ranking de clientes",
    ],
  },
  finanzas: {
    verticals: ["retail", "restaurante", "servicios", "farmacia", "ferreteria"],
    names: [
      "Registro de gasto", "Categorías de gasto", "Gastos del mes", "Utilidad bruta",
      "Utilidad neta", "Margen por producto", "Margen por categoría", "Punto de equilibrio",
      "Flujo de caja proyectado", "Cierre contable del mes", "Conciliación bancaria simple",
      "Cuentas por cobrar", "Cuentas por pagar", "Antigüedad de saldos", "Presupuesto mensual",
      "Desviación de presupuesto", "Gastos fijos", "Gastos variables", "Costo de ventas",
      "Resultado por sucursal", "Rentabilidad por canal", "Ticket promedio",
      "Ventas por metro cuadrado", "Ventas por empleado", "Indicadores del mes",
      "Proyección de ventas", "Simulador de precios", "Simulador de descuentos",
      "Análisis de punto de pedido", "Reporte para contador", "Exportación contable",
      "Impuestos estimados", "Retenciones estimadas", "Nota de ajuste", "Cierre de ejercicio",
    ],
  },
  precios: {
    verticals: ["retail", "farmacia", "ferreteria", "panaderia", "licoreria"],
    names: [
      "Lista de precios", "Nueva lista de precios", "Precio por sucursal", "Precio por canal",
      "Precio mayorista", "Regla de precio automático", "Margen objetivo",
      "Actualización por inflación", "Redondeo psicológico", "Precio de combo", "Promoción 2x1",
      "Descuento por volumen", "Precio de temporada", "Precio de liquidación",
      "Precio mínimo autorizado", "Alerta de margen negativo", "Comparación con competencia",
      "Historial de precios", "Aprobación de cambio de precio", "Etiquetas de precio",
      "Precio con impuesto incluido", "Precio sin impuesto", "Simulación de elasticidad",
      "Precio de costo más margen", "Precio por cliente", "Precio de servicios",
      "Precio de delivery", "Precio de mayoreo escalonado", "Vigencia de promoción",
      "Reversión de precios",
    ],
  },
  reportes: {
    verticals: ["retail", "restaurante", "farmacia", "servicios", "ferreteria", "panaderia"],
    names: [],
  },
  automatizaciones: {
    verticals: ["retail", "restaurante", "farmacia", "servicios", "ferreteria", "panaderia"],
    names: [
      "Reposición automática por mínimo", "Alerta de stock bajo", "Alerta de margen negativo",
      "Alerta de venta inusual", "Cierre de caja programado", "Respaldo diario",
      "Recordatorio de conteo semanal", "Aviso de vencimiento de lote", "Aviso de cliente en mora",
      "Reactivación de cliente inactivo", "Envío de reporte diario", "Envío de reporte semanal",
      "Resumen mensual por correo", "Alerta de producto sin movimiento",
      "Alerta de proveedor retrasado", "Regla de descuento automático",
      "Ajuste por inflación programado", "Rotación de precios de promo",
      "Alerta de caja sin cerrar", "Bloqueo por cupo excedido", "Aviso de turno sin arqueo",
      "Detección de duplicados", "Limpieza de borradores", "Sugerencia de compra semanal",
      "Alerta de quiebre proyectado", "Aviso de pago a proveedor", "Recordatorio de impuestos",
      "Alerta de contraseña débil", "Revisión de permisos", "Auditoría programada",
    ],
  },
  marketing: {
    verticals: ["retail", "restaurante", "servicios", "farmacia", "cafeteria"],
    names: [
      "Plantilla de WhatsApp", "Envío masivo de WhatsApp", "Campaña a clientes inactivos",
      "Campaña de cumpleaños", "Campaña de bienvenida", "Código QR de reseña",
      "Enlace de catálogo público", "Publicación de promoción", "Cupón de referido",
      "Programa de referidos", "Encuesta de satisfacción", "Recordatorio de recompra",
      "Mensaje de carrito abandonado", "Aviso de nueva sucursal", "Aviso de horario especial",
      "Segmento por gasto", "Segmento por frecuencia", "Segmento por producto",
      "Generador de textos de promo", "Calendario de campañas", "Medición de campaña",
      "Cupón de recuperación", "Mensaje de agradecimiento", "Encuesta rápida de producto",
      "Reporte de reputación",
    ],
  },
  equipo: {
    verticals: ["retail", "restaurante", "farmacia", "servicios", "ferreteria"],
    names: [
      "Alta de empleado", "Baja de empleado", "Edición de empleado", "Rol y permisos",
      "PIN de acceso", "Rotación de PIN", "Bloqueo de empleado", "Desbloqueo de empleado",
      "Turnos del equipo", "Horario semanal", "Control de asistencia", "Comisiones por venta",
      "Comisiones por producto", "Metas por empleado", "Ranking de vendedores",
      "Productividad por hora", "Capacitación interna", "Checklist de apertura",
      "Checklist de cierre", "Asignación de caja", "Historial de accesos",
      "Auditoría por empleado", "Venta por empleado", "Propinas por empleado",
      "Desempeño del equipo",
    ],
  },
  integraciones: {
    verticals: ["retail", "restaurante", "servicios", "farmacia", "ferreteria", "panaderia"],
    names: [
      "Conectar WhatsApp Business", "Conectar Google Sheets", "Conectar MercadoPago",
      "Conectar pasarela de tarjetas", "Conectar DIAN", "Conectar impresora de red",
      "Conectar lector de barras", "Conectar báscula", "Conectar datáfono",
      "Webhook de ventas", "API key de integración", "Exportar a contabilidad",
      "Importar desde Excel", "Sincronizar catálogo externo", "Sincronizar stock con tienda online",
      "Publicar catálogo en redes", "Conectar correo transaccional", "Conectar SMS",
      "Conectar Google Maps", "Conectar Wompi", "Conectar Nequi", "Conectar Yape",
      "Conectar OXXO Pay", "Conectar Shopify", "Monitor de integraciones",
    ],
  },
  admin: {
    verticals: ["retail", "restaurante", "farmacia", "servicios", "ferreteria", "panaderia"],
    names: [
      "Datos del negocio", "Sucursales", "Cajas por sucursal", "Impuestos y moneda",
      "Numeración de documentos", "Usuarios y accesos", "Plan y facturación",
      "Métodos de pago", "Horarios de atención", "Respaldos manuales",
      "Restauración de respaldo", "Exportación total de datos", "Eliminación de cuenta",
      "Registro de auditoría", "Términos y privacidad", "Dominio y marca",
      "Plantilla de tirilla", "Logo del negocio", "Notificaciones", "Estado del sistema",
    ],
  },
};

// Reportes: 10 métricas × 4 agrupaciones = 40
const REPORT_METRICS = [
  "ventas", "margen", "unidades vendidas", "ticket promedio",
  "devoluciones", "gastos", "utilidad", "rotación", "quiebre", "cartera",
];
const REPORT_GROUPS = ["por día", "por categoría", "por producto", "por sucursal"];
for (const m of REPORT_METRICS) {
  for (const g of REPORT_GROUPS) {
    CATEGORIES.reportes.names.push(`Reporte de ${m} ${g}`);
  }
}

const KIND_RULES = [
  [/^(Reporte|Análisis|Comparativo|Historial|Ranking|Estado de|Resumen|Indicadores|Proyección|Simulador|Cálculo|Punto de equilibrio|Utilidad|Margen|Rotación|Días de|Inventario valorizado|Antigüedad|Cierre contable|Resultado|Ventas por|Ticket promedio|Productos más vendidos|Consumo|Desempeño|Auditoría de|Cumplimiento|Evaluación|Director de)/i, "report"],
  [/^(Conectar|Integración|Webhook|API key|Exportar a|Importar desde|Sincronizar|Publicar catálogo|Monitor de integraciones)/i, "integration"],
  [/^(Alerta|Aviso|Recordatorio|Reposición automática|Cierre de caja programado|Respaldo diario|Regla|Bloqueo|Detección|Limpieza|Sugerencia|Auditoría programada|Revisión|Rotación de precios|Ajuste por inflación)/i, "automation"],
  [/^(Checklist|Capacitación|Calendario|Plantilla|Generador)/i, "playbook"],
  [/^(Precio de costo más margen|Precio con impuesto|Precio sin impuesto|Lote económico|Punto de reorden|Sugerencia de cantidad)/i, "calculator"],
];

const OVERRIDES = {
  "Ventas del turno": "query",
  "Ventas por cajero": "query",
  "Ventas por método de pago": "query",
  "Ventas por hora": "query",
  "Ventas anuladas del día": "query",
  "Productos bajo mínimo": "query",
  "Clientes en mora": "query",
  "Cuentas por pagar": "query",
  "Cuentas por cobrar": "query",
  "Directorio de proveedores": "query",
  "Lista de precios": "query",
  "Datos del negocio": "query",
  "Sucursales": "query",
  "Usuarios y accesos": "query",
  "Registro de auditoría": "query",
  "Estado del sistema": "query",
  "Código QR de reseña": "action",
  "Extensión de catálogo": "action",
};

const DESC = {
  action: "Hazlo desde aquí, con validación y registro de auditoría.",
  query: "Consulta en vivo sobre tu operación.",
  report: "Reporte generado con tus datos, exportable a CSV.",
  calculator: "Calcula el número con tus propios datos.",
  automation: "Se ejecuta sola cuando se cumple la condición.",
  playbook: "Guía paso a paso con seguimiento.",
  integration: "Conecta un servicio externo y mantiene los datos en sync.",
};

function kindFor(name) {
  if (OVERRIDES[name]) return OVERRIDES[name];
  for (const [re, kind] of KIND_RULES) if (re.test(name)) return kind;
  return "action";
}

function verticalsFor(cat) {
  return CATEGORIES[cat].verticals;
}

const tools = [];
let n = 0;
for (const [category, def] of Object.entries(CATEGORIES)) {
  for (const name of def.names) {
    n += 1;
    const kind = kindFor(name);
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    tools.push({
      key: `${category}.${slug}`,
      name,
      description: DESC[kind],
      category,
      kind,
      verticals: verticalsFor(category),
      impact: kind === "report" || kind === "query" ? 3 : kind === "automation" ? 4 : 3,
      minPlan: category === "integraciones" && name.includes("DIAN") ? "premium" : "pro",
      aiEnabled: true,
      index: n,
    });
  }
}

if (tools.length !== 400) {
  throw new Error(`Se esperaban 400 herramientas, se generaron ${tools.length}`);
}

const outTs = `// GENERADO por scripts/build-tools.mjs — no editar a mano.
import type { Tool } from "./types";

export const TOOLS: Tool[] = ${JSON.stringify(tools, null, 0)} as unknown as Tool[];

export const TOOL_CATEGORIES = ${JSON.stringify(
  Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, CATEGORIES[k].names.length]))
)};
`;

const root = resolve(import.meta.dirname, "..");
mkdirSync(dirname(resolve(root, "apps/web/src/lib/tools.ts")), { recursive: true });
writeFileSync(resolve(root, "apps/web/src/lib/tools.ts"), outTs);
mkdirSync(resolve(root, "supabase/seed"), { recursive: true });
writeFileSync(resolve(root, "supabase/seed/tools.json"), JSON.stringify(tools, null, 2));

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const rows = tools.map((t) =>
  `(${[
    q(t.key),
    q(t.name),
    q(t.description),
    q(t.category),
    q(t.kind),
    `array[${t.verticals.map(q).join(",")}]::text[]`,
    t.impact,
    q(t.minPlan),
    "true",
    t.index,
  ].join(",")})`
);
writeFileSync(
  resolve(root, "supabase/seed/tools.sql"),
  `-- GENERADO por scripts/build-tools.mjs — no editar a mano.\n-- Catálogo global de 400 herramientas.\ninsert into public.tools (key, name, description, category, kind, verticals, impact, min_plan, ai_enabled, sort_index)\nvalues\n${rows.join(",\n")}\non conflict (key) do update set\n  name = excluded.name,\n  description = excluded.description,\n  category = excluded.category,\n  kind = excluded.kind,\n  verticals = excluded.verticals,\n  impact = excluded.impact,\n  min_plan = excluded.min_plan,\n  ai_enabled = excluded.ai_enabled,\n  sort_index = excluded.sort_index;\n`
);

console.log(`OK ${tools.length} herramientas`);
