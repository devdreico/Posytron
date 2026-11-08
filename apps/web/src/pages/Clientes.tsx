import { useState } from "react";
import { useDB, addCustomer, payCustomer, metrics } from "../lib/store";
import { money } from "../lib/format";
import { Badge, Button, Card, Field, Modal, Stat, Table } from "../components/ui";
import { TopBar } from "../components/Shell";

export function Clientes() {
  const db = useDB();
  const m = metrics(db);
  const cur = db.tenant?.currency ?? "COP";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [limit, setLimit] = useState("200000");
  const [pay, setPay] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const target = db.customers.find((c) => c.id === pay);

  return (
    <>
      <TopBar title="Clientes" actions={<Button size="sm" onClick={() => setOpen(true)}>Nuevo cliente</Button>} />
      <main className="mx-auto max-w-[1240px] px-4 py-5 pb-28 md:px-7 md:pb-8">
        <div className="mb-5 grid grid-cols-2 gap-4 rounded-card border border-line bg-white/60 p-4 sm:grid-cols-4">
          <Stat label="Clientes" value={String(db.customers.length)} />
          <Stat label="Cartera" value={money(m.receivables, cur)} tone={m.receivables ? "warn" : "ok"} />
          <Stat label="Con saldo" value={String(db.customers.filter((c) => c.balance > 0).length)} />
          <Stat label="Cupo total" value={money(db.customers.reduce((a, c) => a + c.creditLimit, 0), cur)} />
        </div>

        <Card className="overflow-hidden">
          <Table
            columns={["Cliente", "Teléfono", "Cupo", "Saldo", "Estado", ""]}
            rows={db.customers.map((c) => [
              c.name,
              c.phone,
              money(c.creditLimit, cur),
              money(c.balance, cur),
              c.balance === 0 ? "Al día" : c.balance > c.creditLimit ? "Excedido" : "Con saldo",
              "",
            ])}
            empty="Sin clientes todavía."
          />
        </Card>

        <div className="mt-2 space-y-1">
          {db.customers.map((c) => (
            <div key={c.id} className="flex items-center justify-end gap-2 text-[11px] text-muted">
              <span className="mr-auto">
                {c.name} {c.balance > 0 && <Badge tone={c.balance > c.creditLimit ? "bad" : "warn"}>{money(c.balance, cur)}</Badge>}
              </span>
              <button className="hover:text-ink" onClick={() => setPay(c.id)}>
                Registrar abono
              </button>
            </div>
          ))}
        </div>
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo cliente">
        <div className="space-y-3">
          <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Field label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Field
            label="Cupo de crédito"
            inputMode="numeric"
            value={limit}
            onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))}
            hint="0 si no tiene fiado."
          />
          <Button
            className="w-full"
            onClick={() => {
              if (!name.trim()) return;
              addCustomer({ name: name.trim(), phone, creditLimit: Math.round(Number(limit || 0) * 100) });
              setOpen(false);
              setName("");
              setPhone("");
            }}
          >
            Guardar cliente
          </Button>
        </div>
      </Modal>

      <Modal open={!!pay} onClose={() => setPay(null)} title={`Abono · ${target?.name ?? ""}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-line bg-white/70 px-4 py-3">
            <span className="text-sm text-muted">Saldo actual</span>
            <span className="numeric text-lg">{money(target?.balance ?? 0, cur)}</span>
          </div>
          <Field label="Monto del abono" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
          <Button
            className="w-full"
            onClick={() => {
              if (pay && amount) payCustomer(pay, Math.round(Number(amount) * 100));
              setPay(null);
              setAmount("");
            }}
          >
            Registrar abono
          </Button>
        </div>
      </Modal>
    </>
  );
}
