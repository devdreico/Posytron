import { useState } from "react";
import { useDB, addSupplier, addPurchase, receivePurchase, metrics } from "../lib/store";
import { money, date } from "../lib/format";
import { Badge, Button, Card, Field, Modal, SectionTitle, Stat, Table } from "../components/ui";
import { TopBar } from "../components/Shell";

export function Red() {
  const db = useDB();
  const m = metrics(db);
  const cur = db.tenant?.currency ?? "COP";
  const [tab, setTab] = useState<"proveedores" | "compras">("proveedores");
  const [supOpen, setSupOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [purOpen, setPurOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(db.suppliers[0]?.id ?? "");
  const [productId, setProductId] = useState(db.products[0]?.id ?? "");
  const [qty, setQty] = useState("10");

  return (
    <>
      <TopBar title="Red externa" />
      <main className="mx-auto max-w-[1240px] px-4 py-5 pb-28 md:px-7 md:pb-8">
        <div className="mb-5 grid grid-cols-2 gap-4 rounded-card border border-line bg-white/60 p-4 sm:grid-cols-4">
          <Stat label="Proveedores" value={String(db.suppliers.length)} />
          <Stat label="Por pagar" value={money(m.payables, cur)} tone={m.payables ? "warn" : "ok"} />
          <Stat label="Compras" value={String(db.purchases.length)} />
          <Stat label="Pendientes" value={String(db.purchases.filter((p) => p.status === "pending").length)} />
        </div>

        <div className="mb-4 flex items-center gap-1 border-b border-line">
          {(["proveedores", "compras"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-3 py-2.5 text-[13px] capitalize ${
                tab === t ? "border-ink font-medium" : "border-transparent text-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "proveedores" ? (
          <>
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => setSupOpen(true)}>
                Nuevo proveedor
              </Button>
            </div>
            <Card className="overflow-hidden">
              <Table
                columns={["Proveedor", "Teléfono", "Saldo", "Última orden"]}
                rows={db.suppliers.map((s) => [s.name, s.phone, money(s.balance, cur), s.lastOrderAt ? date(s.lastOrderAt) : "—"])}
                empty="Sin proveedores todavía."
              />
            </Card>
          </>
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => setPurOpen(true)}>
                Nueva orden de compra
              </Button>
            </div>
            <div className="space-y-3">
              {db.purchases.map((p) => {
                const sup = db.suppliers.find((s) => s.id === p.supplierId);
                return (
                  <Card key={p.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium">{p.folio}</span>
                          <Badge tone={p.status === "received" ? "ok" : "warn"}>
                            {p.status === "received" ? "Recibida" : "Pendiente"}
                          </Badge>
                        </div>
                        <div className="mt-0.5 text-[12px] text-muted">
                          {sup?.name} · {date(p.at)} · {p.lines.length} ítems
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="numeric text-[15px]">{money(p.total, cur)}</span>
                        {p.status === "pending" && (
                          <Button size="sm" variant="ghost" onClick={() => receivePurchase(p.id)}>
                            Recibir
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 border-t border-line pt-2 text-[12px] text-muted">
                      {p.lines.map((l) => (
                        <div key={l.productId} className="flex justify-between py-0.5">
                          <span>
                            {l.qty} × {l.name}
                          </span>
                          <span className="numeric">{money(l.qty * l.unitCost, cur)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>

      <Modal open={supOpen} onClose={() => setSupOpen(false)} title="Nuevo proveedor">
        <div className="space-y-3">
          <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Field label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button
            className="w-full"
            onClick={() => {
              if (!name.trim()) return;
              addSupplier({ name: name.trim(), phone, balance: 0 });
              setSupOpen(false);
              setName("");
              setPhone("");
            }}
          >
            Guardar proveedor
          </Button>
        </div>
      </Modal>

      <Modal open={purOpen} onClose={() => setPurOpen(false)} title="Nueva orden de compra">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink/80">Proveedor</span>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px]"
            >
              {db.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink/80">Producto</span>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px]"
            >
              {db.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="Cantidad" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} />
          <Button
            className="w-full"
            onClick={() => {
              const p = db.products.find((x) => x.id === productId);
              if (!p || !supplierId) return;
              const n = Number(qty || 0);
              addPurchase({
                supplierId,
                lines: [{ productId: p.id, name: p.name, qty: n, unitCost: p.cost }],
                total: p.cost * n,
              });
              setPurOpen(false);
            }}
          >
            Crear orden
          </Button>
        </div>
      </Modal>
    </>
  );
}
