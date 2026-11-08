// POST /functions/v1/register-tenant
// Crea el auth.user del administrador y provisiona el tenant.
// La contraseña nunca se guarda en texto plano: la maneja GoTrue.
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

  let input: {
    businessName?: string;
    adminName?: string;
    email?: string;
    password?: string;
    country?: string;
    currency?: string;
    locale?: string;
    timezone?: string;
  };

  try {
    input = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const businessName = input.businessName?.trim();
  const adminName = input.adminName?.trim() || "Administrador";
  const email = input.email?.trim().toLowerCase();
  const password = input.password ?? "";

  if (!businessName) return json({ error: "Falta el nombre del negocio" }, 400);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Correo inválido" }, 400);
  if (password.length < 10) return json({ error: "La contraseña necesita al menos 10 caracteres" }, 400);

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: adminName },
  });

  if (authError || !created.user) {
    return json({ error: authError?.message ?? "No se pudo crear el usuario" }, 400);
  }

  const { data: tenant, error: provisionError } = await admin.rpc("provision_tenant", {
    p_user_id: created.user.id,
    p_business_name: businessName,
    p_admin_name: adminName,
    p_country: input.country ?? "CO",
    p_currency: input.currency ?? "COP",
    p_locale: input.locale ?? "es-CO",
    p_timezone: input.timezone ?? "America/Bogota",
  });

  if (provisionError || !tenant) {
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: provisionError?.message ?? "No se pudo provisionar el negocio" }, 500);
  }

  // Las herramientas sugeridas quedan fijadas para el negocio nuevo.
  const vertical =
    input.businessName && /panader|panific/i.test(input.businessName) ? "panaderia" : null;
  const { data: tools } = await admin.rpc("suggested_tools", { p_vertical: vertical, p_limit: 8 });
  if (Array.isArray(tools) && tools.length) {
    await admin.from("tenant_tools").insert(
      tools.map((t: { key: string }, i: number) => ({
        tenant_id: tenant.id,
        tool_key: t.key,
        pinned: i < 4,
        rank: i,
      })),
    );
  }

  return json({
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, status: tenant.status },
    userId: created.user.id,
  }, 201);
});
