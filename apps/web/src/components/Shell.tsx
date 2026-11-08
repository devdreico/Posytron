import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDB, effectivePlan, logout } from "../lib/store";
import { Badge, Button } from "./ui";

const HUBS = [
  { id: "caja", label: "Caja", path: "caja" },
  { id: "inventario", label: "Inventario", path: "inventario" },
  { id: "administracion", label: "Administración", path: "administracion" },
  { id: "red", label: "Red externa", path: "red" },
  { id: "clientes", label: "Clientes", path: "clientes" },
  { id: "procesos", label: "Procesos", path: "procesos" },
];

export function Icon({ id, className = "h-5 w-5" }: { id: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "caja":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M3 11h18M8 7V5h8v2" />
          <circle cx="16" cy="15" r="1.3" />
        </svg>
      );
    case "inventario":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <rect x="3" y="4" width="8" height="7" rx="1" />
          <rect x="13" y="4" width="8" height="7" rx="1" />
          <rect x="3" y="13" width="8" height="7" rx="1" />
          <rect x="13" y="13" width="8" height="7" rx="1" />
        </svg>
      );
    case "administracion":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
          <circle cx="9" cy="7" r="2" fill="#F1F0EA" />
          <circle cx="15" cy="12" r="2" fill="#F1F0EA" />
          <circle cx="8" cy="17" r="2" fill="#F1F0EA" />
        </svg>
      );
    case "red":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <circle cx="12" cy="5" r="2.4" />
          <circle cx="5" cy="18" r="2.4" />
          <circle cx="19" cy="18" r="2.4" />
          <path d="M12 7.4v4.2M12 11.6 6.6 16M12 11.6 17.4 16" />
        </svg>
      );
    case "clientes":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
        </svg>
      );
    case "procesos":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <rect x="3" y="4" width="7" height="6" rx="1.5" />
          <rect x="14" y="14" width="7" height="6" rx="1.5" />
          <path d="M10 7h4a2 2 0 0 1 2 2v5M6.5 10v4a2 2 0 0 0 2 2H14" />
        </svg>
      );
    default:
      return null;
  }
}

export function Rail() {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const db = useDB();
  const plan = effectivePlan(db);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col items-center border-r border-line bg-paper/80 py-4 md:flex">
        <Link to={`/${slug}`} className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-ink" aria-label="Inicio">
          <svg viewBox="0 0 64 64" className="h-6 w-6">
            <rect x="12" y="14" width="18" height="16" rx="2" fill="none" stroke="#F2C14E" strokeWidth="4" />
            <rect x="34" y="14" width="18" height="9" rx="2" fill="none" stroke="#F2C14E" strokeWidth="4" />
            <rect x="12" y="34" width="40" height="3" rx="1.5" fill="#F2C14E" />
            <circle cx="42" cy="45" r="5" fill="none" stroke="#E24B26" strokeWidth="4" />
          </svg>
        </Link>
        <nav className="flex flex-1 flex-col items-center gap-1">
          {HUBS.map((h) => {
            const active = pathname.startsWith(`/${slug}/${h.path}`);
            return (
              <Link
                key={h.id}
                to={`/${slug}/${h.path}`}
                title={h.label}
                aria-label={h.label}
                aria-current={active ? "page" : undefined}
                className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                  active ? "bg-ink text-paper" : "text-ink/55 hover:bg-black/5 hover:text-ink"
                }`}
              >
                <Icon id={h.id} />
                <span className="pointer-events-none absolute left-14 z-40 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-paper group-hover:block">
                  {h.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-2 pt-2">
          <Link
            to={`/${slug}/administracion/plan`}
            className="rounded-md border border-line px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted hover:text-ink"
            title="Plan"
          >
            {plan}
          </Link>
          <button
            onClick={logout}
            title="Salir"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-xs font-semibold text-ink/70 hover:bg-black/5"
          >
            {db.session?.name?.slice(0, 1).toUpperCase() ?? "?"}
          </button>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-line bg-paper/95 backdrop-blur md:hidden">
        {HUBS.map((h) => {
          const active = pathname.startsWith(`/${slug}/${h.path}`);
          return (
            <Link
              key={h.id}
              to={`/${slug}/${h.path}`}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                active ? "text-ink" : "text-muted"
              }`}
            >
              <Icon id={h.id} className="h-[19px] w-[19px]" />
              {h.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function TopBar({ title, actions }: { title: string; actions?: React.ReactNode }) {
  const { slug } = useParams();
  const db = useDB();
  const plan = effectivePlan(db);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur md:px-7">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{db.tenant?.name}</span>
            <Badge tone={plan === "premium" ? "ok" : plan === "pro" ? "tag" : "neutral"}>{plan.toUpperCase()}</Badge>
          </div>
          <h1 className="truncate text-xs text-muted">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-lg border border-line bg-white/70 px-3 text-xs text-muted hover:text-ink sm:flex"
          >
            Buscar o pedir
            <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>
          {actions}
          <Link to={`/${slug}/herramientas`} className="hidden md:block">
            <Button variant="ghost" size="sm">
              400 herramientas
            </Button>
          </Link>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  if (!open) return null;

  const items = [
    ...HUBS.map((h) => ({ label: h.label, run: () => navigate(`/${slug}/${h.path}`), group: "Ir a" })),
    { label: "Catálogo de 400 herramientas", run: () => navigate(`/${slug}/herramientas`), group: "Ir a" },
    { label: "Nueva venta", run: () => navigate(`/${slug}/caja`), group: "Acción" },
    { label: "Cerrar caja", run: () => navigate(`/${slug}/caja?cierre=1`), group: "Acción" },
    { label: "Agregar producto", run: () => navigate(`/${slug}/inventario?nuevo=1`), group: "Acción" },
    { label: "Plan y facturación", run: () => navigate(`/${slug}/administracion/plan`), group: "Ir a" },
  ].filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-ink/30 p-4 pt-[12vh]" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-lg overflow-hidden rounded-xl border border-line bg-paper shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && items[0]) {
              items[0].run();
              onClose();
              setQ("");
            }
          }}
          placeholder="¿Qué quieres hacer?"
          className="h-12 w-full border-b border-line bg-transparent px-4 text-[15px] outline-none"
        />
        <ul className="max-h-72 overflow-auto py-1">
          {items.map((i) => (
            <li key={i.label}>
              <button
                onClick={() => {
                  i.run();
                  onClose();
                  setQ("");
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-black/5"
              >
                <span>{i.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted">{i.group}</span>
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Nada con ese nombre.</li>}
        </ul>
      </div>
    </div>
  );
}
