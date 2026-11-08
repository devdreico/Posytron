// POST /functions/v1/mercadopago-webhook
// Recibe notificaciones de MercadoPago (preapproval y payment), valida la firma
// x-signature y activa o cancela el plan del tenant de forma idempotente.
import { createClient } from "npm:@supabase/supabase-js@2";

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseSignature(header: string | null) {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(",")) {
    const [k, v] = part.split("=");
    if (k && v) out[k.trim()] = v.trim();
  }
  return out;
}

const PLAN_BY_AMOUNT: Record<number, "pro" | "premium"> = {
  79000: "pro",
  149000: "premium",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const url = new URL(req.url);
  const raw = await req.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const type = String(payload.type ?? payload.topic ?? url.searchParams.get("type") ?? "");
  const dataId = String(
    (payload.data as { id?: string } | undefined)?.id ?? url.searchParams.get("data.id") ?? "",
  );

  if (!dataId) return new Response("Sin id", { status: 400 });

  // --- firma ---
  const secret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
  if (secret) {
    const sig = parseSignature(req.headers.get("x-signature"));
    const requestId = req.headers.get("x-request-id") ?? "";
    if (!sig.ts || !sig.v1) return new Response("Firma ausente", { status: 401 });

    const manifest = `id:${dataId};request-id:${requestId};ts:${sig.ts};`;
    const expected = await hmacHex(secret, manifest);
    if (expected !== sig.v1) return new Response("Firma inválida", { status: 401 });
  }

  const token = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  if (!token) return new Response("Sin credenciales", { status: 500 });

  const isSubscription = type.includes("preapproval") || type.includes("subscription");
  const endpoint = isSubscription
    ? `https://api.mercadopago.com/preapproval/${dataId}`
    : `https://api.mercadopago.com/v1/payments/${dataId}`;

  const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return new Response("No se pudo consultar MercadoPago", { status: 502 });

  const resource = await res.json() as {
    id?: string | number;
    status?: string;
    external_reference?: string;
    transaction_amount?: number;
    auto_recurring?: { transaction_amount?: number };
  };

  const tenantId = resource.external_reference;
  if (!tenantId) return new Response("Sin external_reference", { status: 200 });

  const status = String(resource.status ?? "");
  const amount = Math.round(
    Number(resource.auto_recurring?.transaction_amount ?? resource.transaction_amount ?? 0),
  );
  const plan = PLAN_BY_AMOUNT[amount] ?? "pro";
  const eventId = `${type}:${dataId}:${status}`;

  if (["authorized", "approved", "active"].includes(status)) {
    await admin.rpc("activate_subscription", {
      p_tenant_id: tenantId,
      p_plan: plan,
      p_provider_ref: String(resource.id ?? dataId),
      p_event_id: eventId,
      p_payload: payload,
    });
  } else if (["cancelled", "paused", "rejected", "refunded", "charged_back"].includes(status)) {
    await admin.rpc("cancel_subscription", {
      p_tenant_id: tenantId,
      p_event_id: eventId,
      p_payload: payload,
    });
  } else {
    await admin.from("payment_events").upsert(
      {
        provider: "mercadopago",
        external_id: eventId,
        tenant_id: tenantId,
        kind: `status.${status || "unknown"}`,
        payload,
      },
      { onConflict: "provider,external_id" },
    );
  }

  return new Response("ok", { status: 200 });
});
