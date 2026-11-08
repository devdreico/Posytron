import { Link, useParams } from "react-router-dom";
import { metrics, useDB, effectivePlan, planLimits, topProducts, salesByDay } from "../lib/store";
import { BusinessGlyph, archetypeFor, choosePalette } from "../lib/glyph";
import { money, compact } from "../lib/format";
import { Badge, Card } from "../components/ui";
import { Icon, TopBar } from "../components/Shell";
import { useMemo } from "react";

export function Hero() {
  const { slug } = useParams();
  const db = useDB();
  const m = metrics(db);
  const plan = effectivePlan(db);
  const limits = planLimits(plan);
  const cur = db.tenant?.currency ?? "COP";
  const type = db.profile?.business.type ?? "minimarket";
  const density = db.profile?.business.size === "large" ? 3 : 2;
  const firstName = db.profile?.admin.firstName || db.session?.name || "Administrador";

  const days = useMemo(() => salesByDay(db, 7), [db]);
  const maxDay = Math.max(...days.map((d) => d.total), 1);
  const top = topProducts(db, 3);

  const cards = [
    {
      key: "caja",
      label: "Caja",
      value: money(m.todayTotal, cur),
      sub: `${m.todayCount} ventas hoy`,
      tone: m.openShift ? "ok" : "warn",
      badge: m.openShift ? "Turno abierto" : "Sin turno",
      active: true,
    },
    {
      key: "inventario",
      label: "Inventario",
      value: String(db.products.length),
      sub: `${m.lowStock.length} bajo mínimo`,
      tone: m.lowStock.length ? "warn" : "ok",
      badge: m.lowStock.length ? "Reponer" : "Al día",
      active: db.profile?.ops.inventory ?? true,
    },
    {
      key: "administracion",
      label: "Administración",
      value: plan.toUpperCase(),
      sub: `${db.employees.length}/${limits.employees} empleados`,
      tone: "ok",
      badge: "Plan",
      active: true,
    },
    {
      key: "red",
      label: "Red externa",
      value: money(m.payables, cur),
      sub: `${db.suppliers.length} proveedores`,
      tone: m.payables ? "warn" : "ok",
      badge: "Por pagar",
      active: true,
    },
    {
      key: "clientes",
      label: "Clientes",
      value: money(m.receivables, cur),
      sub: `${db.customers.length} registrados`,
      tone: m.receivables ? "warn" : "ok",
      badge: "Cartera",
      active: db.profile?.ops.credit ?? true,
    },
    {
      key: "procesos",
      label: "Procesos",
      value: String(db.process?.recommendations.length ?? 1),
      sub: db.process ? "POS sugeridos" : "Sin cuestionario",
      tone: "ok",
      badge: "POS",
      active: true,
    },
  ] as const;

  return (
    <>
      <TopBar title={`Hola, ${firstName}`} />
      <main className="mx-auto max-w-[1240px] px-4 py-6 pb-28 md:px-7 md:pb-10">
        <div className="grid gap-4 lg:grid-cols-[1.02fr_1fr]">
          <Card className="relative overflow-hidden p-5">
            <div className="grid-paper absolute inset-0 opacity-70" aria-hidden />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Tu negocio</p>
                  <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight">{db.tenant?.name}</h2>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {db.profile?.location.city}
                    {db.profile?.location.city ? " · " : ""}
                    {db.profile?.business.type}
                  </p>
                </div>
                <Badge tone={plan === "premium" ? "ok" : "tag"}>{plan.toUpperCase()}</Badge>
              </div>

              <BusinessGlyph
                archetype={archetypeFor(type)}
                palette={choosePalette(type)}
                density={density as 1 | 2 | 3}
                seed={db.tenant?.id ?? "posytron"}
                className="mt-2 w-full"
              />

              <div className="mt-1 flex items-center justify-between border-t border-line pt-3 text-[12px] text-muted">
                <span>Dibujado a partir de tu cuestionario</span>
                <Link to={`/${slug}/administracion`} className="text-moss hover:underline">
                  Editar
                </Link>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            {cards.map((c) => {
              const inner = (
                <Card
                  className={`group flex h-full flex-col justify-between p-4 transition-colors ${
                    c.active ? "hover:border-moss/50 hover:bg-white" : "opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-paper text-ink/70 group-hover:border-moss/40 group-hover:text-moss">
                      <Icon id={c.key} className="h-[17px] w-[17px]" />
                    </span>
                    <Badge tone={c.tone as "ok" | "warn"}>{c.badge}</Badge>
                  </div>
                  <div className="mt-4">
                    <div className="text-[12px] text-muted">{c.label}</div>
                    <div className="numeric mt-0.5 text-[19px] font-medium leading-tight">{c.value}</div>
                    <div className="mt-0.5 text-[11px] text-muted">{c.sub}</div>
                  </div>
                  {!c.active && (
                    <span className="mt-2 text-[10px] uppercase tracking-wider text-muted">
                      No aplica a tu negocio
                    </span>
                  )}
                </Card>
              );
              return c.active ? (
                <Link key={c.key} to={`/${slug}/${c.key}`} className="block h-full">
                  {inner}
                </Link>
              ) : (
                <div key={c.key} className="h-full cursor-not-allowed" title="Actívalo en tu perfil">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <Card className="p-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">Últimos 7 días</h3>
                <p className="numeric mt-1 text-[26px] font-medium leading-none">{money(m.weekTotal, cur)}</p>
              </div>
              <div className="text-right text-[12px] text-muted">
                <div>Margen bruto</div>
                <div className="numeric text-[15px] text-ink">{m.grossMargin}%</div>
              </div>
            </div>
            {m.weekTotal === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-line text-center">
                <span className="text-[12px] text-muted">Aún no hay ventas esta semana.</span>
                <Link to={`/${slug}/caja`} className="mt-1 text-[12px] text-moss hover:underline">
                  Registrar la primera venta
                </Link>
              </div>
            ) : (
            <div className="flex h-24 items-end gap-2">
              {days.map((d) => (
                <div key={d.day} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex h-20 w-full items-end">
                    <div
                      className="w-full rounded-t-sm bg-moss/25 transition-all group-hover:bg-moss/45"
                      style={{ height: `${Math.max(4, (d.total / maxDay) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted">{d.label}</span>
                </div>
              ))}
            </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">Más vendido</h3>
            <ul className="mt-3 space-y-2.5">
              {top.length === 0 && <li className="text-sm text-muted">Aún no hay ventas.</li>}
              {top.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="numeric w-4 text-[11px] text-muted">{i + 1}</span>
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="numeric shrink-0 text-ink/70">{compact(p.total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-3 text-[12px] text-muted">
              Inventario valorizado <span className="numeric text-ink">{money(m.stockValue, cur)}</span>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
