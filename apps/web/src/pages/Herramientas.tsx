import { useMemo, useState } from "react";
import { useDB, mutate } from "../lib/store";
import { TOOLS } from "../lib/tools";
import type { Tool, ToolKind } from "../lib/types";
import { runTool } from "../lib/tools-runner";
import { Badge, Button, Card, Modal, Table } from "../components/ui";
import { TopBar } from "../components/Shell";

const CATS = [
  "todas", "caja", "inventario", "compras", "clientes", "finanzas",
  "precios", "reportes", "automatizaciones", "marketing", "equipo", "integraciones", "admin",
];

const KIND_LABEL: Record<ToolKind, string> = {
  query: "consulta",
  report: "reporte",
  calculator: "cálculo",
  action: "acción",
  automation: "automatización",
  playbook: "guía",
  integration: "integración",
};

const KIND_TONE: Record<ToolKind, "neutral" | "ok" | "warn" | "bad" | "tag"> = {
  query: "neutral",
  report: "ok",
  calculator: "tag",
  action: "neutral",
  automation: "warn",
  playbook: "neutral",
  integration: "bad",
};

export function Herramientas() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todas");
  const [kind, setKind] = useState<ToolKind | "todas">("todas");
  const [limit, setLimit] = useState(48);
  const [open, setOpen] = useState<Tool | null>(null);

  const pinned = db.tools.pinned;

  const filtered = useMemo(() => {
    let list = TOOLS.filter((t) => (cat === "todas" ? true : t.category === cat));
    if (kind !== "todas") list = list.filter((t) => t.kind === kind);
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((t) => `${t.name} ${t.category} ${t.description}`.toLowerCase().includes(s));
    }
    // Orden curado del catálogo: agrupa por categoría y respeta la progresión.
    return list.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  }, [q, cat, kind]);

  const result = open ? runTool(open, db) : null;

  const togglePin = (key: string) =>
    mutate((d) => {
      d.tools.pinned = d.tools.pinned.includes(key)
        ? d.tools.pinned.filter((k) => k !== key)
        : [...d.tools.pinned, key];
    });

  return (
    <>
      <TopBar title="Catálogo de herramientas" />
      <main className="mx-auto max-w-[1240px] px-4 py-5 pb-28 md:px-7 md:pb-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar herramienta…"
            className="h-10 flex-1 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-moss"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ToolKind | "todas")}
            className="h-10 rounded-lg border border-line bg-white px-3 text-[13px]"
          >
            <option value="todas">Todos los tipos</option>
            {Object.entries(KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="rail mb-4 flex gap-1.5 overflow-x-auto pb-1">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] capitalize transition-colors ${
                cat === c ? "border-ink bg-ink text-paper" : "border-line bg-white/60 text-muted hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {pinned.length > 0 && cat === "todas" && !q && (
          <div className="mb-5">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Fijadas para tu negocio</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pinned
                .map((k) => TOOLS.find((t) => t.key === k))
                .filter(Boolean)
                .slice(0, 6)
                .map((t) => (
                  <button
                    key={t!.key}
                    onClick={() => setOpen(t!)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-moss/30 bg-moss/[0.06] px-3 py-2.5 text-left"
                  >
                    <span className="truncate text-[13px] font-medium">{t!.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-moss">usar</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        <div className="mb-2 text-[12px] text-muted">{filtered.length} herramientas</div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, limit).map((t) => (
            <Card key={t.key} className="flex flex-col justify-between p-3.5">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[13.5px] font-medium leading-snug">{t.name}</h3>
                  <Badge tone={KIND_TONE[t.kind]}>{KIND_LABEL[t.kind]}</Badge>
                </div>
                <p className="mt-1.5 text-[12px] leading-snug text-muted">{t.description}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted">{t.category}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => togglePin(t.key)}
                    className={`text-[11px] ${pinned.includes(t.key) ? "text-moss" : "text-muted hover:text-ink"}`}
                    title="Fijar"
                  >
                    {pinned.includes(t.key) ? "★" : "☆"}
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => setOpen(t)}>
                    Usar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {limit < filtered.length && (
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" onClick={() => setLimit((l) => l + 48)}>
              Ver más ({filtered.length - limit})
            </Button>
          </div>
        )}
      </main>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} wide>
        {open && result && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={KIND_TONE[open.kind]}>{KIND_LABEL[open.kind]}</Badge>
              <Badge>{open.category}</Badge>
              <Badge>impacto {open.impact}/5</Badge>
              <Badge>{open.minPlan}</Badge>
            </div>
            <p className="text-[13px] text-muted">{open.description}</p>

            {result.kind === "table" ? (
              <div className="overflow-hidden rounded-lg border border-line bg-white/70">
                <Table columns={result.columns} rows={result.rows} />
                {result.note && <div className="border-t border-line px-3 py-2 text-[11px] text-muted">{result.note}</div>}
              </div>
            ) : (
              <div className="rounded-lg border border-line bg-white/70 p-4 text-[13px] leading-relaxed">{result.text}</div>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  togglePin(open.key);
                  setOpen(null);
                }}
              >
                {pinned.includes(open.key) ? "Quitar de fijadas" : "Fijar en mi negocio"}
              </Button>
              <Button className="flex-1" onClick={() => setOpen(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
