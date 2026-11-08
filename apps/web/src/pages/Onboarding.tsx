import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { completeOnboarding, getDB, useDB } from "../lib/store";
import type { BusinessProfile, BusinessType } from "../lib/types";
import { Button, Field } from "../components/ui";

const TYPES: { id: BusinessType; label: string }[] = [
  { id: "minimarket", label: "Minimarket" },
  { id: "kiosk", label: "Tienda de barrio" },
  { id: "supermarket", label: "Supermercado" },
  { id: "restaurant", label: "Restaurante" },
  { id: "cafe", label: "Cafetería o bar" },
  { id: "bakery", label: "Panadería" },
  { id: "pharmacy", label: "Farmacia" },
  { id: "services", label: "Servicios" },
  { id: "workshop", label: "Taller" },
  { id: "warehouse", label: "Distribuidora" },
];

const COUNTRIES = [
  { code: "CO", label: "Colombia", tz: "America/Bogota" },
  { code: "MX", label: "México", tz: "America/Mexico_City" },
  { code: "PE", label: "Perú", tz: "America/Lima" },
  { code: "CL", label: "Chile", tz: "America/Santiago" },
  { code: "AR", label: "Argentina", tz: "America/Argentina/Buenos_Aires" },
];

const PAYMENTS = ["Efectivo", "Tarjeta", "Transferencia", "Nequi", "Yape", "Crédito"];

export function Onboarding() {
  const { slug } = useParams();
  const nav = useNavigate();
  const db = useDB();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState(db.profile?.admin.firstName ?? "");
  const [lastName, setLastName] = useState(db.profile?.admin.lastName ?? "");
  const [businessName, setBusinessName] = useState(db.tenant?.name ?? "");
  const [type, setType] = useState<BusinessType>("minimarket");
  const [size, setSize] = useState<"small" | "medium" | "large">("small");
  const [employees, setEmployees] = useState(3);
  const [country, setCountry] = useState("CO");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [schedule, setSchedule] = useState("Lun a sáb, 7:00 – 21:00");
  const [payments, setPayments] = useState<string[]>(["Efectivo", "Tarjeta"]);
  const [inventory, setInventory] = useState(true);
  const [credit, setCredit] = useState(false);
  const [delivery, setDelivery] = useState(false);

  const steps = ["Tú", "Tu negocio", "Ubicación", "Operación"];

  const togglePayment = (p: string) =>
    setPayments((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const finish = () => {
    const profile: BusinessProfile = {
      admin: { firstName: firstName || "Administrador", lastName, role: "owner" },
      business: { name: businessName || db.tenant?.name || "Mi negocio", type, size, employees },
      location: {
        country,
        city,
        address,
        timezone: COUNTRIES.find((c) => c.code === country)?.tz ?? "America/Bogota",
      },
      ops: { inventory, credit, delivery, paymentMethods: payments, schedule },
    };
    completeOnboarding(profile);
    nav(`/${getDB().tenant?.slug ?? slug}/setup`, { replace: true });
  };

  const canNext =
    step === 0 ? firstName.trim().length > 0 : step === 1 ? businessName.trim().length > 0 : step === 2 ? city.trim().length > 0 : true;

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-2xl px-5 py-10 md:py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-moss transition-all duration-500"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
          <span className="numeric text-xs text-muted">
            {step + 1}/{steps.length}
          </span>
        </div>

        <p className="text-[12px] uppercase tracking-[0.12em] text-muted">
          Hola administrador · {steps[step]}
        </p>

        {step === 0 && (
          <div className="animate-rise">
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight">¿Cómo te llamas?</h1>
            <p className="mt-2 text-[15px] text-muted">Lo usamos para dirigirnos a ti, nada más.</p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
              <Field label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-rise">
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight">Cuéntame de tu negocio</h1>
            <p className="mt-2 text-[15px] text-muted">Con esto dibujo tu local y ordeno tus herramientas.</p>
            <div className="mt-7 space-y-4">
              <Field label="Nombre comercial" value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoFocus />
              <div>
                <span className="mb-2 block text-[13px] font-medium text-ink/80">Tipo de negocio</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={`rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors ${
                        type === t.id ? "border-moss bg-moss/10 font-medium text-moss" : "border-line bg-white/60 hover:border-moss/30"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink/80">Tamaño</span>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value as typeof size)}
                    className="h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px]"
                  >
                    <option value="small">Pequeño</option>
                    <option value="medium">Mediano</option>
                    <option value="large">Grande</option>
                  </select>
                </label>
                <Field
                  label="¿Cuántas personas trabajan?"
                  type="number"
                  min={1}
                  value={employees}
                  onChange={(e) => setEmployees(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-rise">
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight">¿Dónde está?</h1>
            <p className="mt-2 text-[15px] text-muted">Define moneda, impuestos y el formato de tu tirilla.</p>
            <div className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink/80">País</span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px]"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Medellín" autoFocus />
              <Field label="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle 45 #23-12" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-rise">
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight">¿Cómo operas?</h1>
            <p className="mt-2 text-[15px] text-muted">Último paso. Nada de esto es permanente.</p>
            <div className="mt-7 space-y-5">
              <Field label="Horario" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
              <div>
                <span className="mb-2 block text-[13px] font-medium text-ink/80">¿Con qué cobras?</span>
                <div className="flex flex-wrap gap-2">
                  {PAYMENTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePayment(p)}
                      className={`rounded-full border px-3 py-1.5 text-[13px] ${
                        payments.includes(p) ? "border-moss bg-moss/10 text-moss" : "border-line bg-white/60 text-ink/70"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {[
                  ["Llevo inventario", inventory, setInventory],
                  ["Vendo a crédito (fiado)", credit, setCredit],
                  ["Hago domicilios", delivery, setDelivery],
                ].map(([label, value, setter]) => (
                  <label
                    key={label as string}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-line bg-white/60 px-3 py-2.5"
                  >
                    <span className="text-[14px]">{label as string}</span>
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                      className="h-4 w-4 accent-[#2F5D50]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-9 flex items-center justify-between">
          <Button variant="quiet" onClick={() => (step === 0 ? nav(`/${slug}`) : setStep(step - 1))}>
            {step === 0 ? "Salir" : "Atrás"}
          </Button>
          {step < 3 ? (
            <Button size="lg" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Continuar
            </Button>
          ) : (
            <Button size="lg" onClick={finish}>
              Todo listo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
