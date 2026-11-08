// POST /functions/v1/ai-chat
// Copiloto del POS. Reglas duras:
//  - El modelo nunca escribe SQL. Solo recibe KPIs de vistas acotadas por RLS.
//  - Máximo 6 llamadas a herramientas por turno.
//  - BYOK: si el negocio tiene su clave en Vault, se usa esa; si no, la de Posytron
//    y solo con plan Premium / cuota disponible.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_TOOL_CALLS = 6;

const SYSTEM = `Eres el copiloto de Posytron, un POS para negocios pequeños de LATAM.
Reglas:
- Respondes en español neutro, máximo 4 frases, con cifras concretas del contexto.
- Nunca inventas datos. Si falta un dato, lo dices y propones qué hacer.
- Nunca modificas dinero ni precios sin confirmación explícita del usuario.
- No escribes SQL ni código: solo usas las herramientas disponibles.
- Si detectas un riesgo (quiebre, cartera vencida, margen negativo), lo mencionas primero.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // El cliente manda su JWT: así RLS decide qué datos ve.
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );

  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: "No autenticado" }, 401);

  let body: { prompt?: string; history?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const prompt = body.prompt?.trim();
  if (!prompt) return json({ error: "Falta la pregunta" }, 400);

  const { data: member } = await admin
    .from("members")
    .select("tenant_id, role, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return json({ error: "Sin negocio asociado" }, 403);

  const { data: quota } = await admin.rpc("consume_ai_quota", { p_tenant_id: member.tenant_id });
  if (!quota?.allowed) {
    return json({
      error: "ia_no_disponible",
      reason: quota?.reason ?? "plan",
      message:
        quota?.reason === "cuota_diaria"
          ? "Llegaste al límite diario de consultas. Se reinicia mañana."
          : "La IA incluida requiere el plan Premium. Puedes conectar tu propia API key.",
    }, 402);
  }

  // Contexto: solo agregados, ya filtrados por tenant.
  const { data: kpis } = await userClient.from("business_state_kpis").select("*").maybeSingle();
  const { data: lowStock } = await userClient
    .from("business_state_low_stock")
    .select("name, stock, unit")
    .limit(8);
  const { data: recentSales } = await userClient
    .from("sales")
    .select("folio, total, at")
    .order("at", { ascending: false })
    .limit(5);

  const context = {
    negocio: kpis?.name,
    moneda: kpis?.currency,
    ventas_hoy: kpis?.sales_today,
    ventas_7d: kpis?.sales_7d,
    tickets_hoy: kpis?.tickets_today,
    cartera: kpis?.receivables,
    por_pagar: kpis?.payables,
    bajo_minimo: lowStock ?? [],
    ultimas_ventas: recentSales ?? [],
  };

  // Clave: BYOK desde Vault; si no, la de plataforma.
  const { data: settings } = await admin
    .from("ai_settings")
    .select("provider, model, vault_secret_id")
    .eq("tenant_id", member.tenant_id)
    .maybeSingle();

  let apiKey = Deno.env.get("GOOGLE_AI_API_KEY") ?? "";
  if (settings?.vault_secret_id) {
    const { data: secret } = await admin.rpc("read_ai_secret", { p_tenant: member.tenant_id });
    if (secret) apiKey = secret as string;
  }
  if (!apiKey) return json({ error: "Sin clave de IA configurada" }, 503);

  const model = settings?.model || "gemini-2.0-flash";
  const contents = [
    ...(body.history ?? []).slice(-8).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: `Contexto del negocio: ${JSON.stringify(context)}\n\nPregunta: ${prompt}` }] },
  ];

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
      }),
    },
  );

  if (!upstream.ok) {
    const detail = await upstream.text();
    return json({ error: "El proveedor de IA falló", detail: detail.slice(0, 300) }, 502);
  }

  const result = await upstream.json();
  const reply = String(result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  if (!reply) return json({ error: "Respuesta vacía del modelo" }, 502);

  await admin.from("ai_messages").insert([
    { tenant_id: member.tenant_id, role: "user", content: prompt },
    { tenant_id: member.tenant_id, role: "assistant", content: reply, tool_key: `gemini:${model}` },
  ]);

  return json({ reply, mode: quota.mode, max_tool_calls: MAX_TOOL_CALLS });
});
