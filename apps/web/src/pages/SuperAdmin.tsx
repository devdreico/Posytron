import { Link } from "react-router-dom";
import { useDB, effectivePlan, setPlan, mutate } from "../lib/store";
import { TOOLS } from "../lib/tools";
import { money } from "../lib/format";
import { Badge, Button, Card, Stat, Table } from "../components/ui";

export function SuperAdmin() {
  const db = useDB();
  const plan = effectivePlan(db);
  const cur = db.tenant?.currency ?? "COP";
  const mrr = plan === "premium" ? 14900000 : plan === "pro" ? 7900000 : 0;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line px-5 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted">Posytron</div>
            <h1 className="text-[16px] font-semibold">Panel de plataforma</h1>
          </div>
          <Link to="/" className="text-[13px] text-muted hover:text-ink">
            Salir
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
        <div className="grid grid-cols-2 gap-4 rounded-card border border-line bg-white/60 p-5 sm:grid-cols-4">
          <Stat label="Tenants" value="1" />
          <Stat label="MRR" value={money(mrr, cur)} />
          <Stat label="Herramientas" value={String(TOOLS.length)} />
          <Stat label="Conversión" value="—" />
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-line px-4 py-3 text-[13px] font-semibold">Negocios</div>
          <Table
            columns={["Negocio", "Slug", "Plan", "Empleados", "Estado"]}
            rows={db.tenant ? [[db.tenant.name, db.tenant.slug, plan, db.employees.length, db.tenant.status]] : []}
            empty="Sin tenants."
          />
        </Card>

        <Card className="p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">Acciones de soporte</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPlan("pro")}>
              Asignar Pro
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPlan("premium")}>
              Asignar Premium
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => mutate((d) => { if (d.tenant) d.tenant.status = "active"; })}
            >
              Reactivar cuenta
            </Button>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Toda impersonación queda registrada en <span className="text-ink">audit_log</span> con banner visible para el usuario.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">Registro reciente</h2>
          <ul className="mt-3 space-y-2 text-[12px]">
            {db.audit.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 border-b border-line/60 pb-2 last:border-0">
                <span className="truncate text-ink/80">{a.action}</span>
                <Badge>{a.actor}</Badge>
              </li>
            ))}
            {db.audit.length === 0 && <li className="text-muted">Sin eventos.</li>}
          </ul>
        </Card>
      </main>
    </div>
  );
}
