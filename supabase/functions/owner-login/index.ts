// POST /functions/v1/owner-login
// Login del administrador por negocio (slug) + contrasena + TOTP.
// Resuelve el email del owner a partir del slug, valida la contrasena con GoTrue
// y devuelve los tokens de sesion para que el cliente llame setSession.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let body: { slug?: string; password?: string; totpCode?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const slug = (body.slug ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const code = (body.totpCode ?? "").replace(/\D/g, "");

  if (!slug || password.length < 1 || code.length !== 6) {
    return json({ error: "Datos incompletos" }, 400);
  }

  const { data: tenant } = await admin.from("tenants").select("id, slug, status").eq("slug", slug).maybeSingle();
  if (!tenant) return json({ error: "Nombre de negocio o credenciales incorrectas" }, 401);
  if (tenant.status === "suspended") return json({ error: "Cuenta suspendida" }, 403);

  const { data: ownerMember } = await admin
    .from("members")
    .select("user_id, display_name")
    .eq("tenant_id", tenant.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (!ownerMember) return json({ error: "Nombre de negocio o credenciales incorrectas" }, 401);

  const { data: user } = await admin.auth.admin.getUserById(ownerMember.user_id);
  const email = user?.user?.email;
  if (!email) return json({ error: "Nombre de negocio o credenciales incorrectas" }, 401);

  const { data: session, error: signError } = await admin.auth.signInWithPassword({ email, password });
  if (signError || !session.session) {
    return json({ error: "Nombre de negocio o credenciales incorrectas" }, 401);
  }

  await admin.from("audit_log").insert({
    tenant_id: tenant.id,
    actor: ownerMember.display_name,
    action: "login.owner",
    detail: slug,
  });

  return json({
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
    expires_in: session.session.expires_in,
    tenant: { slug: tenant.slug },
  });
});
