import type { DB } from "./types";
import { metrics, topProducts, adjustStock, closeShift, currentShift, pushAiMessage } from "./store";
import { money } from "./format";

const strip = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export interface AiResult {
  reply: string;
  actionLabel?: string;
}

function findProduct(db: DB, text: string) {
  const words = strip(text).split(/\s+/).filter((w) => w.length > 3);
  let best: { p: (typeof db.products)[number]; score: number } | null = null;
  for (const p of db.products) {
    const name = strip(p.name);
    let score = 0;
    for (const w of words) if (name.includes(w)) score += w.length;
    if (score > 0 && (!best || score > best.score)) best = { p, score };
  }
  return best?.p ?? null;
}

export function localAnswer(prompt: string, db: DB): AiResult {
  const q = strip(prompt);
  const m = metrics(db);
  const cur = db.tenant?.currency ?? "COP";

  const priceMatch = q.match(/precio (?:de|del) (.+?) (?:a|en) \$?([\d.]{3,})/);
  if (priceMatch) {
    const p = findProduct(db, priceMatch[1]);
    if (!p) return { reply: "No encontré ese producto en tu catálogo. ¿Cómo se llama exactamente?" };
    const value = Number(priceMatch[2].replace(/\./g, ""));
    adjustStock(p.id, 0, "sin cambio");
    return {
      reply: `No puedo cambiar el precio desde aquí todavía: falta conectar la herramienta de precios. El precio de ${p.name} sigue en ${money(p.price, cur)}.`,
    };
  }

  const stockMatch = q.match(/(?:agrega|añade|sumale|suma) (\d+) (?:de |al )?(.+)/);
  if (stockMatch) {
    const p = findProduct(db, stockMatch[2]);
    if (!p) return { reply: "No encontré ese producto. Dime el nombre como aparece en el catálogo." };
    const qty = Number(stockMatch[1]);
    adjustStock(p.id, qty, "voz");
    return {
      reply: `Listo. ${p.name} quedó con ${p.stock + qty} unidades en stock.`,
      actionLabel: `Stock +${qty} · ${p.name}`,
    };
  }

  if (/cierra.*caja|cerrar.*caja|cierre de caja/.test(q)) {
    const count = q.match(/(\d{4,})/);
    const shift = currentShift(db);
    if (!shift) return { reply: "No hay una caja abierta ahora mismo." };
    if (!count) return { reply: "Para cerrar necesito el conteo final en efectivo. Por ejemplo: «cierra la caja con 850000»." };
    closeShift(Number(count[1]));
    return { reply: "Caja cerrada. Dejé el arqueo y la diferencia registrados en el historial.", actionLabel: "Turno cerrado" };
  }

  if (/cuanto vendi|ventas de hoy|como va la venta|cuanto he vendido/.test(q)) {
    const diff = db.sales.filter((s) => new Date(s.at) >= new Date(new Date().setHours(0, 0, 0, 0))).length;
    return {
      reply: `Hoy llevas ${money(m.todayTotal, cur)} en ${diff} ventas. En los últimos 7 días vas en ${money(m.weekTotal, cur)} con margen bruto de ${m.grossMargin}%.`,
    };
  }

  if (/se me va a acabar|quiebre|stock bajo|bajo minimo|reponer|agotar/.test(q)) {
    const list = m.lowStock.slice(0, 5);
    if (!list.length) return { reply: "Ningún producto está por debajo del mínimo ahora mismo." };
    return {
      reply: `Tienes ${m.lowStock.length} productos bajo mínimo. Los más urgentes: ${list
        .map((p) => `${p.name} (${p.stock} ${p.unit})`)
        .join(", ")}.`,
    };
  }

  if (/me deben|por cobrar|cartera|fiado/.test(q)) {
    return {
      reply: `Te deben ${money(m.receivables, cur)} en total. ${db.customers.filter((c) => c.balance > 0).length} clientes tienen saldo pendiente.`,
    };
  }

  if (/mas vendido|top productos|que se vende mejor|producto estrella/.test(q)) {
    const top = topProducts(db, 3);
    if (!top.length) return { reply: "Todavía no hay ventas registradas para calcular esto." };
    return {
      reply: `Tus productos con más ingresos: ${top.map((t) => `${t.name} (${money(t.total, cur)})`).join(", ")}.`,
    };
  }

  if (/gasto|utilidad|margen|ganancia/.test(q)) {
    return {
      reply: `Margen bruto de los últimos 7 días: ${m.grossMargin}%. Gastos del mes: ${money(m.monthExpenses, cur)}. Cartera por cobrar: ${money(m.receivables, cur)}.`,
    };
  }

  if (/inventario|stock|cuantos productos/.test(q)) {
    return {
      reply: `Tienes ${db.products.length} productos por ${money(m.stockValue, cur)} a costo. ${m.lowStock.length} están bajo mínimo.`,
    };
  }

  if (/empleado|equipo|quien trabaja/.test(q)) {
    return {
      reply: `${db.employees.length} personas con acceso: ${db.employees.map((e) => `${e.name} (${e.role})`).join(", ")}.`,
    };
  }

  return {
    reply:
      "Puedo responder sobre ventas, inventario, clientes, cartera, gastos y equipo. También puedo cambiar precios, sumar stock o cerrar la caja. ¿Qué necesitas?",
  };
}

export async function askAI(prompt: string, db: DB): Promise<AiResult> {
  pushAiMessage("user", prompt);

  const key = db.ai.apiKey?.trim();
  if (key && db.ai.provider === "google" && db.ai.enabled) {
    try {
      const m = metrics(db);
      const cur = db.tenant?.currency ?? "COP";
      const context = {
        negocio: db.tenant?.name,
        plan: db.tenant?.plan,
        dinero: cur,
        ventas_hoy: m.todayTotal / 100,
        ventas_7d: m.weekTotal / 100,
        margen_bruto: m.grossMargin,
        productos_bajo_minimo: m.lowStock.map((p) => `${p.name}: ${p.stock}`),
        cartera: m.receivables / 100,
        top_productos: topProducts(db, 3),
      };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${db.ai.model || "gemini-2.0-flash"}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    "Eres el copiloto de Posytron, un POS para pequeños negocios de LATAM. Respondes en español, en máximo 3 frases, con cifras concretas del contexto. Nunca inventes datos que no estén en el contexto. Si falta información, dilo.",
                },
              ],
            },
            contents: [{ role: "user", parts: [{ text: `Contexto: ${JSON.stringify(context)}\n\nPregunta: ${prompt}` }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const reply = String(text).trim();
          pushAiMessage("assistant", reply, "gemini");
          return { reply };
        }
      }
    } catch {
      /* cae al motor local */
    }
  }

  const local = localAnswer(prompt, db);
  pushAiMessage("assistant", local.reply, "local");
  return local;
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-CO";
  u.rate = 1.02;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function listenOnce(): Promise<string> {
  return new Promise((resolve, reject) => {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) {
      reject(new Error("Este navegador no soporta reconocimiento de voz. Usa el campo de texto."));
      return;
    }
    const rec = new SR();
    rec.lang = "es-CO";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: SpeechRecognitionEvent) => resolve(e.results[0][0].transcript);
    rec.onerror = () => reject(new Error("No te escuché. Intenta otra vez."));
    rec.start();
  });
}
