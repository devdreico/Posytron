import { useState } from "react";
import { useDB, mutate, audit } from "../lib/store";
import type { ProcessProfile } from "../lib/types";
import { Badge, Button, Card, SectionTitle } from "../components/ui";
import { TopBar } from "../components/Shell";

const TASKS: { stage: string; items: { id: string; label: string; caps: string[] }[] }[] = [
  {
    stage: "Comprar",
    items: [
      { id: "suppliers_fixed", label: "Compro siempre a los mismos proveedores", caps: ["proveedores"] },
      { id: "compare_prices", label: "Comparo precios antes de comprar", caps: ["proveedores", "costos"] },
      { id: "daily_intake", label: "Recibo mercancía todos los días", caps: ["recepcion"] },
      { id: "invoice_credit", label: "Compro a crédito con factura", caps: ["cuentas_pagar"] },
    ],
  },
  {
    stage: "Almacenar",
    items: [
      { id: "lots", label: "Controlo lotes y vencimientos", caps: ["lotes"] },
      { id: "warehouse", label: "Tengo bodega separada del mostrador", caps: ["bodega"] },
      { id: "serials", label: "Manejo seriales o garantías", caps: ["seriales"] },
      { id: "weight", label: "Vendo productos por peso", caps: ["peso"] },
    ],
  },
  {
    stage: "Producir",
    items: [
      { id: "kitchen", label: "Preparo comida o bebidas en el local", caps: ["cocina"] },
      { id: "bake", label: "Horneo o produzco a diario", caps: ["produccion"] },
      { id: "combos", label: "Armo combos o promociones", caps: ["combos"] },
    ],
  },
  {
    stage: "Vender",
    items: [
      { id: "tables", label: "Atiendo mesas", caps: ["mesas"] },
      { id: "counter", label: "Vendo en mostrador con escáner", caps: ["mostrador", "barcode"] },
      { id: "delivery", label: "Hago domicilios", caps: ["domicilio"] },
      { id: "credit_sale", label: "Vendo a crédito (fiado)", caps: ["credito"] },
      { id: "wholesale", label: "Vendo al por mayor", caps: ["mayoreo"] },
    ],
  },
  {
    stage: "Cobrar",
    items: [
      { id: "card", label: "Cobro con datáfono", caps: ["tarjeta"] },
      { id: "tips", label: "Manejo propinas", caps: ["propinas"] },
      { id: "appointments", label: "Trabajo con citas o agenda", caps: ["agenda"] },
      { id: "commissions", label: "Pago comisiones a mi equipo", caps: ["comisiones"] },
    ],
  },
  {
    stage: "Cerrar",
    items: [
      { id: "daily_close", label: "Cuadro la caja todos los días", caps: ["arqueo"] },
      { id: "weekly_count", label: "Reviso inventario cada semana", caps: ["conteo"] },
      { id: "taxes", label: "Necesito reportes para contabilidad", caps: ["contabilidad"] },
    ],
  },
];

const POS: { id: string; name: string; caps: string[]; why: string }[] = [
  {
    id: "retail",
    name: "Retail / minimarket",
    caps: ["mostrador", "barcode", "conteo", "combos", "arqueo", "tarjeta", "credito", "bodega", "recepcion"],
    why: "Venta rápida en mostrador, inventario por sucursal y control de caja.",
  },
  {
    id: "restaurante",
    name: "Restaurante",
    caps: ["mesas", "cocina", "propinas", "domicilio", "combos", "arqueo", "tarjeta"],
    why: "Mesas, comandas a cocina y división de cuentas.",
  },
  {
    id: "farmacia",
    name: "Farmacia",
    caps: ["lotes", "mostrador", "barcode", "conteo", "credito", "recepcion", "contabilidad"],
    why: "Lotes, vencimientos y control estricto de inventario.",
  },
  {
    id: "servicios",
    name: "Servicios",
    caps: ["agenda", "comisiones", "mostrador", "tarjeta", "arqueo"],
    why: "Agenda por profesional, comisiones y cobro en el local.",
  },
  {
    id: "ferreteria",
    name: "Ferretería",
    caps: ["seriales", "mayoreo", "mostrador", "barcode", "bodega", "cotizacion", "credito"],
    why: "Medidas, seriales, mayoreo y cotizaciones.",
  },
  {
    id: "panaderia",
    name: "Panadería",
    caps: ["peso", "produccion", "mostrador", "combos", "arqueo", "tarjeta"],
    why: "Producción diaria, venta por peso y merma.",
  },
  {
    id: "licoreria",
    name: "Licorería",
    caps: ["mostrador", "barcode", "lotes", "mayoreo", "tarjeta", "arqueo"],
    why: "Control de vencimientos, mayoreo y horarios extendidos.",
  },
  {
    id: "cafeteria",
    name: "Cafetería",
    caps: ["mesas", "combos", "mostrador", "propinas", "tarjeta", "arqueo"],
    why: "Servicio rápido, combos y propinas.",
  },
];

function compute(tasks: string[]): ProcessProfile["recommendations"] {
  const caps = new Set<string>();
  for (const g of TASKS) for (const t of g.items) if (tasks.includes(t.id)) t.caps.forEach((c) => caps.add(c));

  const total = caps.size || 1;
  return POS.map((pos) => {
    const matched = pos.caps.filter((c) => caps.has(c));
    let score = matched.length / total;
    if (tasks.includes("tables") && pos.id === "restaurante") score += 0.15;
    if (tasks.includes("lots") && pos.id === "farmacia") score += 0.1;
    if (tasks.includes("bake") && pos.id === "panaderia") score += 0.1;
    return {
      pos: pos.id,
      score: Math.min(0.99, Math.round(score * 100) / 100),
      matched,
    };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export function Procesos() {
  const db = useDB();
  const [selected, setSelected] = useState<string[]>(db.process?.tasks ?? []);
  const [editing, setEditing] = useState(!db.process);

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const save = () => {
    const recs = compute(selected);
    const stages: Record<string, string[]> = {};
    for (const g of TASKS) stages[g.stage] = selected.filter((id) => g.items.some((i) => i.id === id));
    mutate((d) => {
      d.process = {
        tasks: selected,
        stages,
        recommendations: recs,
        active: d.process?.active ?? [recs[0]?.pos ?? "retail"],
        completedAt: new Date().toISOString(),
      };
    });
    audit("procesos.cuestionario", `${selected.length} tareas · top ${recs[0]?.pos}`);
    setEditing(false);
  };

  const profile = db.process;
  const active = profile?.active ?? [];

  return (
    <>
      <TopBar
        title="Procesos"
        actions={
          profile && !editing ? (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Repetir cuestionario
            </Button>
          ) : null
        }
      />
      <main className="mx-auto max-w-[1000px] px-4 py-5 pb-28 md:px-7 md:pb-8">
        {editing ? (
          <div>
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight">¿Qué haces para que tu negocio funcione?</h2>
            <p className="mt-1 max-w-xl text-[14px] text-muted">
              Marca lo que realmente pasa en tu día. Con esto ordeno los POS que te sirven y dejo tus herramientas arriba.
            </p>

            <div className="mt-6 space-y-5">
              {TASKS.map((g) => (
                <div key={g.stage}>
                  <SectionTitle>{g.stage}</SectionTitle>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.items.map((t) => {
                      const on = selected.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggle(t.id)}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left text-[13px] transition-colors ${
                            on ? "border-moss bg-moss/10 text-moss" : "border-line bg-white/60 hover:border-moss/30"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              on ? "border-moss bg-moss text-[9px] text-paper" : "border-line"
                            }`}
                          >
                            {on ? "✓" : ""}
                          </span>
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-20 mt-6 flex items-center justify-between gap-3 rounded-xl border border-line bg-paper/95 p-3 backdrop-blur md:bottom-4">
              <span className="text-[12px] text-muted">{selected.length} tareas marcadas</span>
              <Button onClick={save} disabled={selected.length === 0}>
                Ver mis POS recomendados
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight">Tus POS recomendados</h2>
            <p className="mt-1 text-[14px] text-muted">
              Calculado con las {profile?.tasks.length} tareas de tu cuestionario. Puedes activar más de uno.
            </p>

            <div className="mt-6 space-y-3">
              {profile?.recommendations.map((r, i) => {
                const pos = POS.find((p) => p.id === r.pos)!;
                const on = active.includes(r.pos);
                return (
                  <Card key={r.pos} className={`p-5 ${on ? "border-moss/50" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="numeric text-[11px] text-muted">#{i + 1}</span>
                          <h3 className="text-[16px] font-semibold">{pos.name}</h3>
                          {on && <Badge tone="ok">Activo</Badge>}
                        </div>
                        <p className="mt-1 max-w-lg text-[13px] text-muted">{pos.why}</p>
                      </div>
                      <div className="text-right">
                        <div className="numeric text-[22px] font-medium">{Math.round(r.score * 100)}%</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted">coincidencia</div>
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${r.score * 100}%` }} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {r.matched.slice(0, 6).map((c) => (
                          <span key={c} className="rounded-full border border-line bg-paper px-2 py-0.5 text-[10px] text-muted">
                            {c}
                          </span>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant={on ? "ghost" : "primary"}
                        onClick={() =>
                          mutate((d) => {
                            if (!d.process) return;
                            d.process.active = on
                              ? (d.process.active ?? []).filter((x) => x !== r.pos)
                              : [...(d.process.active ?? []), r.pos];
                          })
                        }
                      >
                        {on ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="mt-5 p-5">
              <SectionTitle>Herramientas que se activaron</SectionTitle>
              <p className="text-[13px] leading-relaxed text-muted">
                Las {profile?.tasks.length} tareas marcadas priorizan tus herramientas en el catálogo y en el copiloto. Todo sigue
                disponible en <span className="text-ink">400 herramientas</span>, ordenado por impacto.
              </p>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
