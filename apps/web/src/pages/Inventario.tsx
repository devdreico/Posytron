import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDB, addProduct, updateProduct, adjustStock, metrics } from "../lib/store";
import type { Product } from "../lib/types";
import { money } from "../lib/format";
import { Badge, Button, Card, Field, Modal, Stat, Table } from "../components/ui";
import { TopBar } from "../components/Shell";

const EMPTY: Omit<Product, "id"> = {
  name: "",
  sku: "",
  barcode: "",
  category: "Abarrotes",
  price: 0,
  cost: 0,
  stock: 0,
  minStock: 3,
  unit: "un",
};

export function Inventario() {
  const db = useDB();
  const [params, setParams] = useSearchParams();
  const cur = db.tenant?.currency ?? "COP";
  const m = metrics(db);
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [form, setForm] = useState<Omit<Product, "id"> | null>(params.get("nuevo") === "1" ? { ...EMPTY } : null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjust, setAdjust] = useState<Product | null>(null);
  const [delta, setDelta] = useState("1");

  const rows = useMemo(() => {
    let list = db.products;
    if (q) list = list.filter((p) => `${p.name} ${p.sku} ${p.barcode} ${p.category}`.toLowerCase().includes(q.toLowerCase()));
    if (onlyLow) list = list.filter((p) => p.stock <= p.minStock);
    return list;
  }, [db.products, q, onlyLow]);

  const save = () => {
    if (!form || !form.name.trim()) return;
    if (editing) updateProduct(editing.id, form);
    else addProduct(form);
    setForm(null);
    setEditing(null);
    setParams({});
  };

  const exportCsv = () => {
    const head = "nombre,sku,codigo,categoria,precio,costo,stock,minimo\n";
    const body = db.products
      .map((p) => [p.name, p.sku, p.barcode, p.category, p.price / 100, p.cost / 100, p.stock, p.minStock].join(","))
      .join("\n");
    const blob = new Blob([head + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "productos.csv";
    a.click();
  };

  const importCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = text.split(/\r?\n/).filter(Boolean).slice(1);
      for (const line of lines) {
        const [name, sku, barcode, category, price, cost, stock, minStock] = line.split(",");
        if (!name) continue;
        addProduct({
          name,
          sku: sku ?? "",
          barcode: barcode ?? "",
          category: category ?? "Abarrotes",
          price: Math.round(Number(price || 0) * 100),
          cost: Math.round(Number(cost || 0) * 100),
          stock: Number(stock || 0),
          minStock: Number(minStock || 3),
          unit: "un",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <TopBar
        title="Inventario"
        actions={
          <Button size="sm" onClick={() => setForm({ ...EMPTY })}>
            Nuevo producto
          </Button>
        }
      />
      <main className="mx-auto max-w-[1240px] px-4 py-5 pb-28 md:px-7 md:pb-8">
        <div className="mb-5 grid grid-cols-2 gap-4 rounded-card border border-line bg-white/60 p-4 sm:grid-cols-4">
          <Stat label="Productos" value={String(db.products.length)} />
          <Stat label="Valor a costo" value={money(m.stockValue, cur)} />
          <Stat label="Bajo mínimo" value={String(m.lowStock.length)} tone={m.lowStock.length ? "warn" : "ok"} />
          <Stat label="Margen 7d" value={`${m.grossMargin}%`} />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto…"
            className="h-10 flex-1 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-moss"
          />
          <Button variant={onlyLow ? "primary" : "ghost"} size="sm" onClick={() => setOnlyLow((v) => !v)}>
            Bajo mínimo
          </Button>
          <Button variant="ghost" size="sm" onClick={exportCsv}>
            Exportar
          </Button>
          <label className="cursor-pointer">
            <span className="inline-flex h-8 items-center rounded-md border border-line bg-white/60 px-3 text-[13px] hover:bg-white">
              Importar CSV
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
          </label>
        </div>

        <Card className="overflow-hidden">
          <Table
            columns={["Producto", "Categoría", "Stock", "Mín.", "Costo", "Precio", ""]}
            rows={rows.map((p) => [
              p.name,
              p.category,
              p.stock,
              p.minStock,
              money(p.cost, cur),
              money(p.price, cur),
              "",
            ])}
            empty="Sin productos. Agrega el primero o importa un CSV."
          />
        </Card>

        <div className="mt-3 space-y-1">
          {rows.slice(0, 12).map((p) => (
            <div key={p.id} className="flex items-center justify-end gap-2 text-[11px] text-muted">
              <span className="mr-auto truncate">{p.stock <= p.minStock ? "⚠ " : ""}{p.name}</span>
              <button className="hover:text-ink" onClick={() => setAdjust(p)}>
                Ajustar stock
              </button>
              <span>·</span>
              <button
                className="hover:text-ink"
                onClick={() => {
                  setEditing(p);
                  setForm({ ...p });
                }}
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      </main>

      <Modal open={!!form} onClose={() => { setForm(null); setEditing(null); setParams({}); }} title={editing ? "Editar producto" : "Nuevo producto"}>
        {form && (
          <div className="space-y-3">
            <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              <Field label="Código de barras" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
            <Field label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Precio de venta"
                inputMode="numeric"
                value={form.price ? String(form.price / 100) : ""}
                onChange={(e) => setForm({ ...form, price: Math.round(Number(e.target.value || 0) * 100) })}
              />
              <Field
                label="Costo"
                inputMode="numeric"
                value={form.cost ? String(form.cost / 100) : ""}
                onChange={(e) => setForm({ ...form, cost: Math.round(Number(e.target.value || 0) * 100) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Stock"
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              />
              <Field
                label="Mínimo"
                type="number"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
              />
            </div>
            <Button className="w-full" size="lg" onClick={save}>
              {editing ? "Guardar cambios" : "Agregar producto"}
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={!!adjust} onClose={() => setAdjust(null)} title={`Ajustar stock · ${adjust?.name ?? ""}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-line bg-white/70 px-4 py-3">
            <span className="text-sm text-muted">Stock actual</span>
            <span className="numeric text-lg">{adjust?.stock}</span>
          </div>
          <Field
            label="Cantidad (negativo para restar)"
            inputMode="numeric"
            value={delta}
            onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ""))}
            hint="Se registra en auditoría con motivo «ajuste»."
          />
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              if (adjust) adjustStock(adjust.id, Number(delta));
              setAdjust(null);
              setDelta("1");
            }}
          >
            Aplicar ajuste
          </Button>
        </div>
      </Modal>
    </>
  );
}
