import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  useDB, sell, openShift, closeShift, currentShift, metrics, effectivePlan, planLimits,
} from "../lib/store";
import type { Payment, Sale, SaleLine } from "../lib/types";
import { money, time, date } from "../lib/format";
import { Badge, Button, Card, Field, Modal, SectionTitle, Table } from "../components/ui";
import { TopBar } from "../components/Shell";

const TAX = 0.19;

export function Caja() {
  const { slug } = useParams();
  const db = useDB();
  const [params, setParams] = useSearchParams();
  const cur = db.tenant?.currency ?? "COP";
  const m = metrics(db);
  const shift = currentShift(db);
  const plan = effectivePlan(db);

  const [q, setQ] = useState("");
  const [cart, setCart] = useState<{ id: string; qty: number }[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState("Efectivo");
  const [received, setReceived] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFloat, setOpenFloat] = useState("150000");
  const [closeCount, setCloseCount] = useState("");

  const closeModal = params.get("cierre") === "1";

  const filtered = useMemo(
    () =>
      db.products
        .filter((p) => (q ? `${p.name} ${p.barcode} ${p.sku}`.toLowerCase().includes(q.toLowerCase()) : true))
        .slice(0, 24),
    [db.products, q]
  );

  const lines: SaleLine[] = cart.map((c) => {
    const p = db.products.find((x) => x.id === c.id)!;
    const total = p.price * c.qty;
    return {
      productId: p.id,
      name: p.name,
      qty: c.qty,
      unitPrice: p.price,
      taxRate: TAX,
      taxAmount: Math.round(total - total / (1 + TAX)),
      total,
    };
  });
  const total = lines.reduce((a, l) => a + l.total, 0);

  const add = (id: string) =>
    setCart((c) => {
      const found = c.find((x) => x.id === id);
      if (found) return c.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { id, qty: 1 }];
    });
  const dec = (id: string) =>
    setCart((c) => c.flatMap((x) => (x.id === id ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x])));

  const charge = () => {
    setError(null);
    if (!planLimits(plan).sell) {
      setError("Tu plan Free no permite vender. Activa Pro en Plan y facturación.");
      return;
    }
    const rec = method === "Efectivo" ? Math.round(Number(received || total / 100) * 100) : total;
    const payments: Payment[] = [{ method, amount: rec }];
    const res = sell(lines, payments);
    if (!res.ok) {
      setError(res.error ?? "No se pudo cobrar.");
      return;
    }
    setPayOpen(false);
    setReceipt(res.sale ?? null);
    setCart([]);
    setReceived("");
  };

  return (
    <>
      <TopBar
        title={shift ? `Turno abierto · ${time(shift.openedAt)}` : "Sin turno abierto"}
        actions={
          shift ? (
            <Button size="sm" variant="ghost" onClick={() => setParams({ cierre: "1" })}>
              Cerrar caja
            </Button>
          ) : null
        }
      />

      <main className="mx-auto max-w-[1240px] px-4 py-5 pb-28 md:px-7 md:pb-8">
        {!shift && (
          <Card className="mb-4 flex flex-col items-start justify-between gap-3 border-tag/50 bg-tag/10 p-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-[14px] font-medium">Abre un turno para empezar a vender</div>
              <div className="text-[12px] text-muted">Registra la base en efectivo con la que arranca la caja.</div>
            </div>
            <div className="flex items-end gap-2">
              <Field label="Base" value={openFloat} onChange={(e) => setOpenFloat(e.target.value)} className="w-32" />
              <Button onClick={() => openShift(Math.round(Number(openFloat) * 100))}>Abrir caja</Button>
            </div>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, código o SKU…"
                className="h-11 flex-1 rounded-lg border border-line bg-white px-3 text-[15px] outline-none focus:border-moss"
              />
              <Badge>{db.products.length} productos</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p.id)}
                  className="group flex h-[92px] flex-col justify-between rounded-lg border border-line bg-white/70 p-3 text-left transition-colors hover:border-moss/50 hover:bg-white"
                >
                  <span className="line-clamp-2 text-[13px] font-medium leading-snug">{p.name}</span>
                  <span className="flex items-end justify-between">
                    <span className="numeric text-[13px] text-ink/80">{money(p.price, cur)}</span>
                    <span className={`text-[10px] ${p.stock <= p.minStock ? "text-signal" : "text-muted"}`}>{p.stock} u</span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">
                  Ningún producto coincide.{" "}
                  <a href={`/${slug}/inventario?nuevo=1`} className="text-moss hover:underline">
                    Agregar producto
                  </a>
                </div>
              )}
            </div>
          </section>

          <aside className="lg:sticky lg:top-[86px] lg:h-fit">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="text-[13px] font-semibold">Venta actual</span>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-[11px] text-muted hover:text-signal">
                    Vaciar
                  </button>
                )}
              </div>

              <div className="max-h-[38vh] overflow-y-auto px-4">
                {lines.length === 0 && <p className="py-8 text-center text-[13px] text-muted">Toca un producto para agregarlo.</p>}
                {lines.map((l) => (
                  <div key={l.productId} className="flex items-center justify-between gap-2 border-b border-line/60 py-2.5 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium">{l.name}</div>
                      <div className="numeric text-[11px] text-muted">{money(l.unitPrice, cur)} c/u</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => dec(l.productId)} className="h-6 w-6 rounded border border-line text-xs hover:bg-black/5">
                        −
                      </button>
                      <span className="numeric w-6 text-center text-[13px]">{l.qty}</span>
                      <button onClick={() => add(l.productId)} className="h-6 w-6 rounded border border-line text-xs hover:bg-black/5">
                        +
                      </button>
                    </div>
                    <span className="numeric w-16 text-right text-[13px]">{money(l.total, cur)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-line px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-muted">Total</span>
                  <span className="numeric text-[24px] font-medium">{money(total, cur)}</span>
                </div>
                <div className="mt-0.5 text-right text-[10px] text-muted">IVA 19% incluido</div>
                <Button size="lg" className="mt-3 w-full" disabled={cart.length === 0} onClick={() => setPayOpen(true)}>
                  Cobrar
                </Button>
              </div>
            </Card>
          </aside>
        </div>

        <div className="mt-6">
          <SectionTitle right={<span className="text-[12px] text-muted">Hoy: {money(m.todayTotal, cur)}</span>}>
            Últimas ventas
          </SectionTitle>
          <Card className="overflow-hidden">
            <Table
              columns={["Folio", "Hora", "Ítems", "Pago", "Total"]}
              rows={db.sales.slice(0, 8).map((s) => [
                s.folio,
                `${date(s.at)} ${time(s.at)}`,
                s.items.reduce((a, i) => a + i.qty, 0),
                s.payments.map((p) => p.method).join(" + "),
                money(s.total, cur),
              ])}
              empty="Todavía no hay ventas."
            />
          </Card>
        </div>
      </main>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Cobrar">
        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-white/70 p-4">
            <div className="text-[12px] text-muted">Total a cobrar</div>
            <div className="numeric text-[28px] font-medium">{money(total, cur)}</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Efectivo", "Tarjeta", "Transferencia"].map((pm) => (
              <button
                key={pm}
                onClick={() => setMethod(pm)}
                className={`rounded-lg border px-2 py-2.5 text-[13px] ${
                  method === pm ? "border-moss bg-moss/10 font-medium text-moss" : "border-line bg-white/60"
                }`}
              >
                {pm}
              </button>
            ))}
          </div>
          {method === "Efectivo" && (
            <Field
              label="Recibido"
              inputMode="numeric"
              value={received}
              onChange={(e) => setReceived(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={String(Math.round(total / 100))}
              hint={
                received
                  ? `Cambio: ${money(Math.max(0, Math.round(Number(received) * 100) - total), cur)}`
                  : "Deja vacío para cobrar el monto exacto."
              }
            />
          )}
          {error && <div className="rounded-lg border border-signal/30 bg-signal/5 px-3 py-2 text-[13px] text-signal">{error}</div>}
          <Button size="lg" className="w-full" onClick={charge}>
            Confirmar cobro
          </Button>
        </div>
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Venta registrada">
        {receipt && (
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-white p-4 font-mono text-[12px] leading-relaxed">
              <div className="text-center text-[13px] font-semibold">{db.tenant?.name}</div>
              <div className="text-center text-[10px] text-muted">{db.profile?.location.address}</div>
              <div className="my-2 border-t border-dashed border-line" />
              {receipt.items.map((i) => (
                <div key={i.productId} className="flex justify-between gap-2">
                  <span className="truncate">
                    {i.qty} × {i.name}
                  </span>
                  <span className="whitespace-nowrap">{money(i.total, cur)}</span>
                </div>
              ))}
              <div className="my-2 border-t border-dashed border-line" />
              <div className="flex justify-between font-semibold">
                <span>TOTAL</span>
                <span>{money(receipt.total, cur)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted">
                <span>IVA incluido</span>
                <span>{money(receipt.tax, cur)}</span>
              </div>
              <div className="mt-2 text-center text-[10px] text-muted">
                {receipt.folio} · {time(receipt.at)} · {receipt.cashier}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => window.print()}>
                Imprimir
              </Button>
              <Button className="flex-1" onClick={() => setReceipt(null)}>
                Nueva venta
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={closeModal} onClose={() => setParams({})} title="Cerrar caja">
        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-white/70 p-4 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted">Base inicial</span>
              <span className="numeric">{money(shift?.openingFloat ?? 0, cur)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted">Ventas del turno</span>
              <span className="numeric">
                {money(
                  db.sales.filter((s) => s.shiftId === shift?.id).reduce((a, s) => a + s.total, 0),
                  cur
                )}
              </span>
            </div>
          </div>
          <Field
            label="Conteo final en efectivo"
            inputMode="numeric"
            value={closeCount}
            onChange={(e) => setCloseCount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="850000"
          />
          <Button
            size="lg"
            className="w-full"
            disabled={!closeCount}
            onClick={() => {
              closeShift(Math.round(Number(closeCount) * 100));
              setCloseCount("");
              setParams({});
            }}
          >
            Cerrar turno
          </Button>
        </div>
      </Modal>
    </>
  );
}
