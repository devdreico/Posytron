// POST /functions/v1/employee-login
// Login de empleado: tenant + username + PIN. No requiere correo.
// El PIN se valida contra pin_hash (bcrypt de pgcrypto) con service_role.
// Se emite un enlace mágico de un solo uso y el cliente lo canjea con verifyOtp.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DOMAIN = "users.posytron.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let body: { slug?: string; username?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const slug = body.slug?.trim().toLowerCase();
  const username = body.username?.trim().toLowerCase();
  const pin = (body.pin ?? "").replace(/\D/g, "");

  if (!slug || !username || pin.length < 4) {
    return json({ error: "Datos incompletos" }, 400);
  }

  const { data: tenant } = await admin.from("tenants").select("id, slug, status").eq("slug", slug).maybeSingle();
  if (!tenant) return json({ error: "Negocio o credenciales incorrectas" }, 401);
  if (tenant.status === "suspended") return json({ error: "Cuenta suspendida" }, 403);

  const { data: employee } = await admin
    .from("employees")
    .select("id, name, user_id, active, pin_hash")
    .eq("tenant_id", tenant.id)
    .eq("username", username)
    .maybeSingle();

  if (!employee || !employee.active) return json({ error: "Usuario o PIN incorrecto" }, 401);

  const { data: pinOk, error: pinError } = await admin.rpc("verify_pin", {
    p_hash: employee.pin_hash,
    p_pin: pin,
  });

  if (pinError || pinOk !== true) {
    await admin.rpc("log_login_failure", { p_tenant: tenant.id, p_username: username });
    return json({ error: "Usuario o PIN incorrecto" }, 401);
  }

  const email = `${slug}.${username}@${DOMAIN}`;

  // Si el empleado aún no tiene usuario de auth, se crea al vuelo (sin contraseña: solo magic link).
  let userId = employee.user_id as string | null;
  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: employee.name, employee: true },
    });
    if (createError || !created.user) return json({ error: "No se pudo habilitar el acceso" }, 500);
    userId = created.user.id;

    await admin.from("employees").update({ user_id: userId }).eq("id", employee.id);
    await admin.from("members").insert({
      tenant_id: tenant.id,
      user_id: userId,
      role: "cashier",
      display_name: employee.name,
      employee_id: employee.id,
    });
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !link?.properties?.hashed_token) {
    return json({ error: "No se pudo iniciar sesión" }, 500);
  }

  await admin.from("audit_log").insert({
    tenant_id: tenant.id,
    actor: employee.name,
    action: "login.employee",
    detail: username,
  });

  return json({
    email,
    token_hash: link.properties.hashed_token,
    expires_in: 60 * 60 * 8,
  });
});
