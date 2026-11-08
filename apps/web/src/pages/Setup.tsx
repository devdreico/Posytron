import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { runSetup, useDB } from "../lib/store";
import { archetypeFor } from "../lib/glyph";

const STEPS = [
  "Creando tu sucursal y tu caja principal",
  "Aplicando impuestos y moneda del país",
  "Preparando lista de precios y medios de pago",
  "Sembrando categorías base para tu negocio",
  "Dibujando la representación de tu local",
  "Activando tus primeras herramientas",
];

export function Setup() {
  const { slug } = useParams();
  const nav = useNavigate();
  const db = useDB();
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= STEPS.length) {
      const t = setTimeout(() => {
        runSetup();
        nav(`/${slug}`, { replace: true });
      }, 650);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDone((d) => d + 1), 480);
    return () => clearTimeout(t);
  }, [done, nav, slug]);

  const type = db.profile?.business.type ?? "minimarket";
  const archetype = archetypeFor(type);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="mb-6 h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-moss transition-all duration-500 ease-out"
            style={{ width: `${(done / STEPS.length) * 100}%` }}
          />
        </div>

        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Todo listo</h1>
        <p className="mt-1 text-[15px] text-muted">Preparando tu negocio digital…</p>

        <ul className="mt-8 space-y-3">
          {STEPS.map((s, i) => {
            const state = i < done ? "done" : i === done ? "active" : "idle";
            return (
              <li key={s} className="flex items-start gap-3 text-[14px]">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    state === "done"
                      ? "border-moss bg-moss text-paper"
                      : state === "active"
                      ? "border-moss text-moss"
                      : "border-line text-muted"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className={state === "idle" ? "text-muted" : "text-ink"}>{s}</span>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 border-t border-line pt-4 text-[11px] text-muted">
          Representación elegida: <span className="font-medium text-ink">{archetype.replace(/_/g, " ")}</span>
        </p>
      </div>
    </div>
  );
}
