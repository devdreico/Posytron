import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  useDB, mutate, metrics, effectivePlan, planLimits, setPlan, addExpense, inviteEmployee,
  toggleEmployee, setAi,
} from "../lib/store";
import type { Plan } from "../lib/types";
import { money, dateTime } from "../lib/format";
import { Badge, Button, Card, Field, Modal, SectionTitle, Stat, Table } from "../components/ui";
import { TopBar } from "../components/Shell";

const TABS = ["Empresa", "Usuarios", "Plan", "Gastos", "Reportes", "IA", "Auditoría"] as const;
type Tab = (typeof TABS)[number];

const PLANS: { id: Plan; name: string; price: string; features: string[] }[] = [
  { id: "free", name: "Free", price: "Gratis", features: ["Cuenta y demo", "Sin ventas reales", "0 empleados"] },
  { id: "pro", name: "Pro", price: "$79.000 / mes", features: ["400 herramientas POS", "3 empleados", "1 sucursal + 1 caja"] },
  { id: "premium", name: "Premium", price: "$149.000 / mes", features: ["Todo lo de Pro", "IA incluida (fair use)", "10 empleados"] },
];

export function Admin() {
  const { pathname } = useLocation();
  const db = useDB();
  const [tab, setTab] = useState<Tab>("Empresa");
  const plan = effectivePlan(db);
  const limits = planLimits(plan);
  const m = metrics(db);
  const cur = db.tenant?.currency ?? "COP";

  const [empOpen, setEmpOpen] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empUser, setEmpUser] = useState("");
  const [empRole, setEmpRole] = useState<"cashier" | "supervisor">("cashier");
  const [empPin, setEmpPin] = useState("");
  const [empErr, setEmpErr] = useState<string | null>(null);

  const [expOpen, setExpOpen] = useState(false);
  const [expCat, setExpCat] = useState("Arriendo");
  const [expAmount, setExpAmount] = useState("");
  const [expNote, setExpNote] = useState("");

  const [aiKey, setAiKey] = useState(db.ai.apiKey);
  const [aiModel, setAiModel] = useState(db.ai.model);

  // Permite abrir una pestaña concreta desde la URL: /administracion/plan
  useEffect(() => {
    const seg = pathname.split("/")[3];
    if (!seg) return;
    const found = TABS.find((t) => t.toLowerCase() === seg.toLowerCase());
    if (found) setTab(found);
  }, [pathname]);

  const invite = () => {
    setEmpErr(null);
    const res = inviteEmployee({
      name: empName.trim(),
      username: empUser.trim().toLowerCase(),
      role: empRole,
      pin: empPin,
    });
    if (!res.ok) return setEmpErr(res.error ?? "No se pudo invitar");
    setEmpOpen(false);
    setEmpName("");
    setEmpUser("");
    setEmpPin("");
  };

  return (
    <>
      <TopBar title="Administración" />
      <main className="mx-auto max-w-[1240px] px-4 py-5 pb-28 md:px-7 md:pb-8">
        <div className="rail mb-5 flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] transition-colors ${
                tab === t ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Empresa" && (
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card className="p-5">
              <SectionTitle>Datos del negocio</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Nombre comercial"
                  value={db.tenant?.name ?? ""}
                  onChange={(e) => mutate((d) => { if (d.tenant) d.tenant.name = e.target.value; })}
                />
                <Field label="Slug (URL)" value={db.tenant?.slug ?? ""} readOnly hint={`posytron.com/${db.tenant?.slug}`} />
                <Field
                  label="Ciudad"
                  value={db.profile?.location.city ?? ""}
                  onChange={(e) => mutate((d) => { if (d.profile) d.profile.location.city = e.target.value; })}
                />
                <Field
                  label="Dirección"
                  value={db.profile?.location.address ?? ""}
                  onChange={(e) => mutate((d) => { if (d.profile) d.profile.location.address = e.target.value; })}
                />
                <Field
                  label="Horario"
                  value={db.profile?.ops.schedule ?? ""}
                  onChange={(e) => mutate((d) => { if (d.profile) d.profile.ops.schedule = e.target.value; })}
                />
                <Field label="Moneda" value={db.tenant?.currency ?? ""} readOnly />
              </div>
              <div className="mt-4 space-y-2">
                {[
                  ["Llevo inventario", "inventory"],
                  ["Vendo a crédito", "credit"],
                  ["Hago domicilios", "delivery"],
                ].map(([label, key]) => (
                  <label key={key} className="flex cursor-pointer items-center justify-between rounded-lg border border-line bg-white/60 px-3 py-2.5">
                    <span className="text-[14px]">{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(db.profile?.ops[key as "inventory"])}
                      onChange={(e) => mutate((d) => { if (d.profile) (d.profile.ops as never as Record<string, boolean>)[key] = e.target.checked; })}
                      className="h-4 w-4 accent-[#2F5D50]"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted">Los cambios se guardan al escribir. Todo queda en auditoría.</p>
            </Card>

            <Card className="p-5">
              <SectionTitle>Resumen</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Plan" value={plan.toUpperCase()} />
                <Stat label="Empleados" value={`${db.employees.length}/${limits.employees}`} />
                <Stat label="Sucursales" value="1" />
                <Stat label="Cajas" value="1" />
              </div>
              <div className="mt-5 border-t border-line pt-4 text-[13px]">
                <div className="flex justify-between py-1">
                  <span className="text-muted">Productos</span>
                  <span className="numeric">{db.products.length}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted">Ventas registradas</span>
                  <span className="numeric">{db.sales.length}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted">Inventario a costo</span>
                  <span className="numeric">{money(m.stockValue, cur)}</span>
                </div>
              </div>
              <Button variant="ghost" className="mt-4 w-full" onClick={() => setTab("Plan")}>
                Ver plan y facturación
              </Button>
            </Card>
          </div>
        )}

        {tab === "Usuarios" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] text-muted">
                {db.employees.length} de {limits.employees} disponibles en {plan.toUpperCase()}
              </div>
              <Button size="sm" onClick={() => setEmpOpen(true)}>
                Invitar empleado
              </Button>
            </div>
            <Card className="overflow-hidden">
              <Table
                columns={["Nombre", "Usuario", "Rol", "PIN", "Estado", ""]}
                rows={db.employees.map((e) => [e.name, e.username, e.role, "••••", e.active ? "Activo" : "Bloqueado", ""])}
                empty="Sin empleados todavía. Invita al primero."
              />
            </Card>
            <div className="mt-2 space-y-1">
              {db.employees.map((e) => (
                <div key={e.id} className="flex justify-end gap-2 text-[11px] text-muted">
                  <span className="mr-auto">{e.name}</span>
                  <button className="hover:text-ink" onClick={() => toggleEmployee(e.id)}>
                    {e.active ? "Bloquear" : "Reactivar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Plan" && (
          <div>
            <div className="grid gap-3 md:grid-cols-3">
              {PLANS.map((p) => (
                <Card key={p.id} className={`p-5 ${plan === p.id ? "border-moss/60 ring-1 ring-moss/20" : ""}`}>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[16px] font-semibold">{p.name}</h3>
                    {plan === p.id && <Badge tone="ok">Actual</Badge>}
                  </div>
                  <div className="numeric mt-1 text-[13px] text-muted">{p.price}</div>
                  <ul className="mt-4 space-y-1.5 text-[13px] text-ink/75">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-moss">·</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5 w-full"
                    variant={plan === p.id ? "ghost" : p.id === "free" ? "quiet" : "primary"}
                    disabled={plan === p.id}
                    onClick={() => setPlan(p.id)}
                  >
                    {plan === p.id ? "Plan actual" : p.id === "free" ? "Bajar a Free" : "Pagar con MercadoPago"}
                  </Button>
                </Card>
              ))}
            </div>
            <Card className="mt-4 p-5">
              <SectionTitle>Facturación</SectionTitle>
              <p className="text-[13px] leading-relaxed text-muted">
                El cobro se hace con MercadoPago (preapproval). Al confirmarse el pago se envía un enlace de acceso al correo
                del administrador. En esta versión local el cambio de plan se aplica directo para probar los límites.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                <Badge tone="ok">Trial 14 días</Badge>
                {db.tenant?.trialEndsAt && <span>Termina {dateTime(db.tenant.trialEndsAt)}</span>}
              </div>
            </Card>
          </div>
        )}

        {tab === "Gastos" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] text-muted">Gastos del mes: <span className="numeric text-ink">{money(m.monthExpenses, cur)}</span></div>
              <Button size="sm" onClick={() => setExpOpen(true)}>
                Registrar gasto
              </Button>
            </div>
            <Card className="overflow-hidden">
              <Table
                columns={["Fecha", "Categoría", "Nota", "Monto"]}
                rows={db.expenses.map((e) => [dateTime(e.at), e.category, e.note, money(e.amount, cur)])}
                empty="Sin gastos registrados."
              />
            </Card>
          </div>
        )}

        {tab === "Reportes" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <SectionTitle>Ventas por categoría</SectionTitle>
              <Table
                columns={["Categoría", "Ventas"]}
                rows={Object.entries(
                  db.sales.reduce<Record<string, number>>((acc, s) => {
                    s.items.forEach((i) => {
                      const p = db.products.find((x) => x.id === i.productId);
                      const k = p?.category ?? "Otros";
                      acc[k] = (acc[k] ?? 0) + i.total;
                    });
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => [k, money(v, cur)])}
              />
            </Card>
            <Card className="p-5">
              <SectionTitle>Indicadores</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Ventas 7d" value={money(m.weekTotal, cur)} />
                <Stat label="Ticket promedio" value={money(m.ticket, cur)} />
                <Stat label="Margen bruto" value={`${m.grossMargin}%`} />
                <Stat label="Cartera" value={money(m.receivables, cur)} />
              </div>
              <Button variant="ghost" className="mt-4 w-full" onClick={() => window.print()}>
                Imprimir reporte
              </Button>
            </Card>
          </div>
        )}

        {tab === "IA" && (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Card className="p-5">
              <SectionTitle>Tu API key (BYOK)</SectionTitle>
              <p className="mb-4 text-[13px] leading-relaxed text-muted">
                Con tu propia clave, la IA corre por tu cuenta y no consume la cuota de Posytron. En producción se guarda cifrada
                en Supabase Vault y nunca vuelve al navegador.
              </p>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink/80">Proveedor</span>
                  <select
                    value={db.ai.provider}
                    onChange={(e) => setAi({ provider: e.target.value as typeof db.ai.provider })}
                    className="h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px]"
                  >
                    <option value="google">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="groq">Groq</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="custom">Endpoint compatible OpenAI</option>
                  </select>
                </label>
                <Field
                  label="API key"
                  type="password"
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  placeholder="AIza…"
                  hint="Se usa solo en tu navegador en esta versión. No se envía a ningún servidor de Posytron."
                />
                <Field label="Modelo" value={aiModel} onChange={(e) => setAiModel(e.target.value)} hint="Ej.: gemini-2.0-flash" />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setAi({ apiKey: aiKey.trim(), model: aiModel.trim(), enabled: Boolean(aiKey.trim()) || plan === "premium" });
                    }}
                  >
                    Guardar clave
                  </Button>
                  <Button variant="ghost" onClick={() => { setAiKey(""); setAiModel("gemini-2.0-flash"); setAi({ apiKey: "", enabled: plan === "premium" }); }}>
                    Borrar
                  </Button>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <SectionTitle>Estado</SectionTitle>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between border-b border-line py-2">
                  <span className="text-muted">IA habilitada</span>
                  <Badge tone={db.ai.enabled ? "ok" : "neutral"}>{db.ai.enabled ? "Sí" : "No"}</Badge>
                </div>
                <div className="flex justify-between border-b border-line py-2">
                  <span className="text-muted">Modo</span>
                  <span>{db.ai.apiKey ? "BYOK" : plan === "premium" ? "Incluida" : "Local"}</span>
                </div>
                <div className="flex justify-between border-b border-line py-2">
                  <span className="text-muted">Cuota</span>
                  <span>{plan === "premium" ? "Fair use · 150/día" : "Sin cuota"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted">Consultas hoy</span>
                  <span className="numeric">{db.aiMessages.filter((m) => m.role === "user").length}</span>
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-muted">
                Sin clave y sin Premium, el copiloto responde con el motor local: consultas sobre tus datos, cambios de stock y
                cierre de caja.
              </p>
            </Card>
          </div>
        )}

        {tab === "Auditoría" && (
          <Card className="overflow-hidden">
            <Table
              columns={["Cuándo", "Quién", "Acción", "Detalle"]}
              rows={db.audit.slice(0, 60).map((a) => [dateTime(a.at), a.actor, a.action, a.detail])}
              empty="Sin eventos registrados todavía."
            />
          </Card>
        )}
      </main>

      <Modal open={empOpen} onClose={() => setEmpOpen(false)} title="Invitar empleado">
        <div className="space-y-3">
          <Field label="Nombre" value={empName} onChange={(e) => setEmpName(e.target.value)} autoFocus />
          <Field label="Usuario" value={empUser} onChange={(e) => setEmpUser(e.target.value)} hint="Sin espacios. Así entra al POS." />
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink/80">Rol</span>
            <select
              value={empRole}
              onChange={(e) => setEmpRole(e.target.value as "cashier" | "supervisor")}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px]"
            >
              <option value="cashier">Cajero</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </label>
          <Field
            label="PIN"
            inputMode="numeric"
            maxLength={6}
            value={empPin}
            onChange={(e) => setEmpPin(e.target.value.replace(/\D/g, ""))}
            hint="4 a 6 dígitos. El empleado no necesita correo."
          />
          {empErr && <div className="rounded-lg border border-signal/30 bg-signal/5 px-3 py-2 text-[13px] text-signal">{empErr}</div>}
          <Button className="w-full" size="lg" onClick={invite}>
            Crear acceso
          </Button>
        </div>
      </Modal>

      <Modal open={expOpen} onClose={() => setExpOpen(false)} title="Registrar gasto">
        <div className="space-y-3">
          <Field label="Categoría" value={expCat} onChange={(e) => setExpCat(e.target.value)} />
          <Field label="Monto" inputMode="numeric" value={expAmount} onChange={(e) => setExpAmount(e.target.value.replace(/\D/g, ""))} />
          <Field label="Nota" value={expNote} onChange={(e) => setExpNote(e.target.value)} />
          <Button
            className="w-full"
            onClick={() => {
              if (!expAmount) return;
              addExpense({ category: expCat, amount: Math.round(Number(expAmount) * 100), note: expNote });
              setExpOpen(false);
              setExpAmount("");
              setExpNote("");
            }}
          >
            Guardar gasto
          </Button>
        </div>
      </Modal>
    </>
  );
}
