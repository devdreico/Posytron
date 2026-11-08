import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDB, loginEmployee, loginOwner, DEMO_SLUG, DEMO_PASSWORD } from "../lib/store";
import { isCloud, cloudLoginOwner, cloudLoginEmployee } from "../lib/cloud";
import { Button, Field } from "../components/ui";

export function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"owner" | "employee">("owner");
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res =
      isCloud
        ? mode === "owner"
          ? await cloudLoginOwner(slug, password, code)
          : await cloudLoginEmployee(slug, username, pin)
        : mode === "owner"
        ? loginOwner(slug, password, code)
        : loginEmployee(slug, username, pin);
    if (!res.ok) {
      setError(res.error ?? "No pudimos entrar");
      return;
    }
    const db = getDB();
    nav(`/${db.tenant?.slug ?? ""}`, { replace: true });
  };

  const fillDemo = () => {
    setMode("owner");
    setSlug(DEMO_SLUG);
    setPassword(DEMO_PASSWORD);
    setCode("123456");
    setError(null);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-paper lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper">
            <svg viewBox="0 0 64 64" className="h-6 w-6">
              <rect x="12" y="14" width="18" height="16" rx="2" fill="none" stroke="#10201C" strokeWidth="4" />
              <rect x="34" y="14" width="18" height="9" rx="2" fill="none" stroke="#10201C" strokeWidth="4" />
              <rect x="12" y="34" width="40" height="3" rx="1.5" fill="#10201C" />
              <circle cx="42" cy="45" r="5" fill="none" stroke="#E24B26" strokeWidth="4" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-wide">Posytron</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-[42px] font-semibold leading-[1.05] tracking-tight">
            Tu negocio,
            <br />
            con memoria.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-paper/70">
            Un POS que aprende cómo trabajas, ordena lo que vendes y te responde con tus propios números.
            Caja, inventario, clientes y proveedores en un solo lugar.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-paper/15 pt-6 text-[13px] text-paper/60">
          <div>
            <div className="numeric text-lg text-paper">400</div>
            herramientas
          </div>
          <div>
            <div className="numeric text-lg text-paper">6</div>
            centros de mando
          </div>
          <div>
            <div className="numeric text-lg text-paper">LATAM</div>
            multi-país
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="text-lg font-semibold">Posytron</div>
            <div className="text-sm text-muted">Tu negocio, con memoria.</div>
          </div>

          <div className="mb-6 flex gap-1 rounded-lg border border-line bg-white/60 p-1">
            {(["owner", "employee"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`h-8 flex-1 rounded-md text-[13px] font-medium transition-colors ${
                  mode === m ? "bg-ink text-paper" : "text-muted hover:text-ink"
                }`}
              >
                {m === "owner" ? "Administrador" : "Empleado"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field
              label="Nombre de tu negocio"
              placeholder="minimarket-ana"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              autoComplete="username"
              autoFocus
            />

            {mode === "owner" ? (
              <>
                <Field
                  label="Contraseña"
                  type="password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <Field
                  label="Código de 6 dígitos"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  hint="TOTP de tu app autenticadora. En esta versión, cualquier código de 6 dígitos entra."
                  inputClassName="numeric tracking-[0.35em] text-center"
                />
              </>
            ) : (
              <>
                <Field
                  label="Usuario"
                  placeholder="maria"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
                <Field
                  label="PIN"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  hint="Prueba: maria / 1234"
                />
              </>
            )}

            {error && (
              <div role="alert" className="rounded-lg border border-signal/30 bg-signal/5 px-3 py-2 text-[13px] text-signal">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full">
              Entrar
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between text-[13px]">
            <Link to="/registro" className="text-moss hover:underline">
              Crear cuenta
            </Link>
            <button onClick={fillDemo} className="text-muted hover:text-ink">
              Usar el demo
            </button>
          </div>

          <p className="mt-8 border-t border-line pt-4 text-[11px] leading-relaxed text-muted">
            Demo: <span className="numeric">minimarket-ana</span> · <span className="numeric">posytron2026</span> · código{" "}
            <span className="numeric">123456</span>
          </p>
        </div>
      </section>
    </div>
  );
}
