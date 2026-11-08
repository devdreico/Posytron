import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register, getDB } from "../lib/store";
import { slugify } from "../lib/seed";
import { Button, Field } from "../components/ui";

export function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const slug = useMemo(() => slugify(name), [name]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    const res = register({ name, email, password });
    if (!res.ok) {
      setError(res.error ?? "No pudimos crear la cuenta.");
      return;
    }
    const db = getDB();
    nav(`/${db.tenant?.slug}`, { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-12">
      <Link to="/" className="mb-8 text-sm text-muted hover:text-ink">
        ← Volver al acceso
      </Link>
      <h1 className="text-[30px] font-semibold leading-tight tracking-tight">Crea la cuenta de tu negocio</h1>
      <p className="mt-2 text-[15px] text-muted">
        14 días de prueba con todas las herramientas. Sin tarjeta. Si no pagas, la cuenta sigue existiendo en modo demo.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field
          label="Nombre del negocio"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Minimarket Ana"
          autoFocus
          hint={slug ? `Tu dirección será posytron.com/${slug}` : "Se convierte en tu usuario y tu URL."}
        />
        <Field
          label="Correo del administrador"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ana@correo.com"
          hint="Aquí llega el acceso después del pago."
        />
        <Field label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} hint="Mínimo 10 caracteres." />
        <Field label="Repite la contraseña" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

        {error && (
          <div role="alert" className="rounded-lg border border-signal/30 bg-signal/5 px-3 py-2 text-[13px] text-signal">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full">
          Crear cuenta
        </Button>
      </form>

      <p className="mt-5 text-[11px] leading-relaxed text-muted">
        Al crear la cuenta aceptas los términos y el tratamiento de datos. Puedes exportar o eliminar todo desde Administración.
      </p>
    </div>
  );
}
