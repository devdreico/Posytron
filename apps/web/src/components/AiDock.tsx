import { useEffect, useRef, useState } from "react";
import { useDB, effectivePlan, setAi } from "../lib/store";
import { askAI, listenOnce, speak } from "../lib/ai";
import { Button } from "./ui";

export function AiDock() {
  const db = useDB();
  const plan = effectivePlan(db);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [db.aiMessages.length, open]);

  const send = async (prompt: string) => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError(null);
    setText("");
    try {
      const res = await askAI(prompt, db);
      if (res.actionLabel) speak(res.reply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pude responder.");
    } finally {
      setBusy(false);
    }
  };

  const mic = async () => {
    setListening(true);
    setError(null);
    try {
      const said = await listenOnce();
      await send(said);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No te escuché.");
    } finally {
      setListening(false);
    }
  };

  const locked = plan === "free" && !db.ai.enabled;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper shadow-lift transition-transform hover:scale-[1.02] md:bottom-6 md:right-6"
        aria-expanded={open}
      >
        <span className={`h-2 w-2 rounded-full ${db.ai.apiKey || plan === "premium" ? "bg-tag" : "bg-signal"}`} />
        {open ? "Cerrar" : "Hablar con tu negocio"}
      </button>

      {open && (
        <div className="fixed bottom-36 right-3 z-40 flex h-[62vh] w-[calc(100vw-24px)] max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-lift md:bottom-24 md:right-6">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Copiloto</div>
              <div className="text-[11px] text-muted">
                {db.ai.apiKey ? `Gemini · tu API key` : plan === "premium" ? "Gemini incluido en Premium" : "Motor local"}
              </div>
            </div>
            {plan === "premium" && !db.ai.enabled && (
              <Button size="sm" variant="ghost" onClick={() => setAi({ enabled: true })}>
                Activar
              </Button>
            )}
          </div>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {db.aiMessages.length === 0 && (
              <div className="space-y-2 text-sm text-muted">
                <p>Pregúntame lo que sea de tu negocio. También puedes pedirme cambios.</p>
                <div className="flex flex-wrap gap-1.5">
                  {["¿Cuánto vendí hoy?", "¿Qué se me va a acabar?", "¿Cuánto me deben?", "Top productos"].map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-line bg-white/70 px-2.5 py-1 text-[12px] text-ink/70 hover:border-moss/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {db.aiMessages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === "user" ? "bg-ink text-paper" : "border border-line bg-white"
                  }`}
                >
                  {m.content}
                  {m.tool === "local" && m.role === "assistant" && (
                    <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted">modo local</span>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-muted">Pensando…</div>}
            {error && <div className="text-xs text-signal">{error}</div>}
          </div>

          <div className="border-t border-line p-3">
            <div className="flex items-center gap-2">
              <button
                onClick={mic}
                disabled={listening}
                aria-label="Hablar"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  listening ? "border-signal bg-signal/10 text-signal" : "border-line bg-white text-ink/70 hover:border-moss/40"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
                </svg>
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(text)}
                placeholder={listening ? "Escuchando…" : locked ? "Activa un plan con IA" : "Escribe o dicta…"}
                className="h-10 flex-1 rounded-full border border-line bg-white px-3 text-[13px] outline-none focus:border-moss"
                disabled={busy}
              />
              <Button size="sm" onClick={() => send(text)} disabled={busy || !text.trim()}>
                Enviar
              </Button>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-muted">
              Confirma lo que toque dinero. Todo queda en auditoría y se puede deshacer 24 h.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
