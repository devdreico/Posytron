# Posytron — Plan de implementación v1

**Fecha:** 2026-11-08 · **Estado:** borrador para ejecución · **Autor:** Andrei

---

## 1. Resumen ejecutivo

Posytron es un **POS SaaS multi-país (LATAM) y multi-vertical**: el comerciante compra su cuenta dentro del propio software y opera todo su negocio —varias sucursales, cajas y verticales— desde un solo panel.

**Arma de entrada:** la IA que responde el negocio. El comerciante pregunta *"¿qué me está dejando plata?"*, *"¿qué se me va a acabar esta semana?"* y recibe respuesta con números reales de su operación, no un dashboard que hay que aprender a leer.

**Lo que Posytron NO es (fase 1):** no es un ERP contable, no reemplaza a Siigo en contabilidad formal y no emite factura electrónica DIAN hasta fase 4.

**Restricción de realidad:** "todos los POS en uno + IA + asesoría" es un producto de 12–18 meses. El plan está cortado en fases lanzables; cada una se puede vender.

---

## 2. Decisiones cerradas

| # | Decisión | Valor |
|---|---|---|
| 1 | Alcance | Multi-vertical + agregador de terceros + white-label, por fases |
| 2 | Mercado | LATAM operativo; Colombia como playa inicial |
| 3 | Vertical MVP | Retail / minimarket |
| 4 | Plataforma | Web online (React 19 PWA) + app nativa Expo |
| 5 | Stack | React 19 + Vite + TS + Tailwind / FastAPI + SQLModel + Postgres |
| 6 | DIAN | Fase 4, con proveedor tecnológico autorizado |
| 7 | Cobro | Suscripción self-service, MercadoPago |
| 8 | IA | Copiloto + insights + agentes por vertical + marketplace de asesores (por fases) |
| 9 | Hardware MVP | Impresora térmica 80mm, lector HID, cajón monedero |
| 10 | Sucursales | Multi-sucursal y multi-caja desde el modelo de datos |
| 11 | Diferenciador | IA que responde el negocio |
| 12 | Equipo | 1 dev full-time + IA como par |

---

## 3. Modelo de negocio

### Planes

| Concepto | Valor |
|---|---|
| Trial | 14 días, sin tarjeta, 1 tenant por email/NIT, tope 300 ventas |
| Plan base | 1 sucursal + 1 caja |
| Caja adicional | +30% del plan base |
| Pago anual | 2 meses gratis |

### Precio por país (ancla USD 19–25/sucursal)

| País | Moneda | Sucursal / mes | Caja extra / mes |
|---|---|---|---|
| Colombia | COP | 79.000 | 25.000 |
| México | MXN | 399 | 129 |
| Perú | PEN | 69 | 25 |
| Chile | CLP | 19.900 | 6.900 |
| Argentina | USD | 19 | 6 |

### Cobro
- **MercadoPago Preapproval** para suscripción recurrente; Checkout Pro como fallback.
- Webhooks idempotentes (`payment_id` como clave).
- Dunning: reintento a los 1 / 3 / 7 días → modo solo-lectura a los 15 días → suspensión a los 30 (datos conservados 90 días).
- Costo por tenant estimado: infra USD 2–3 + LLM USD 1–3. Margen sano desde el plan base.

---

## 4. Alcance

### Módulos del MVP (todos confirmados)

| Módulo | Qué incluye |
|---|---|
| Catálogo e inventario | Productos, variantes, códigos de barras, categorías, listas de precio, stock por sucursal, mínimos, kardex |
| Ventas | Carrito, multi-pago, descuentos por línea/total, tirilla 80mm, devoluciones |
| Caja y turnos | Apertura con base, movimientos, retiros, arqueo, diferencias |
| Compras | Proveedores, orden de compra, recepción, costo promedio ponderado |
| Clientes | Historial, cupo de crédito, fiado con abonos y mora |
| Descuentos | Por producto/categoría/total, combos, precio por volumen |
| Gastos | Gastos operativos, categorías, impacto en rentabilidad |
| Reportes | Ventas, margen, top productos, por cajero/sucursal, exportable |
| SaaS | Registro, trial, suscripción, facturación, panel super-admin |
| IA | Preguntas en lenguaje natural, insights proactivos |
| Móvil | Venta rápida, escaneo por cámara, impresión Bluetooth |

### Fuera del MVP

Restaurante (mesas/KDS), farmacia (lotes/INVIMA), servicios (agenda), marketplace de asesores, agregador de POS de terceros, white-label, facturación electrónica.

---

## 5. Arquitectura

### Monorepo

```
Posytron/
├── apps/
│   ├── pos-web/        React 19 + Vite + TS + Tailwind (PWA)
│   ├── pos-mobile/     Expo (React Native)
│   ├── admin/          Panel interno SaaS (super-admin)
│   └── api/            FastAPI + SQLModel
├── packages/
│   ├── core/           Lógica de negocio TS: carrito, impuestos, precios, cola de reintentos
│   ├── ui/             Design system compartido web
│   └── sdk/            Cliente API generado desde OpenAPI
├── infra/              Docker Compose, migraciones, CI, backups
└── docs/               Este plan + ADRs
```

Gestión: **pnpm workspaces + Turborepo**. Backend Python separado del pipeline Node (ruff + mypy + pytest).

### Diagrama

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   pos-web    │  │  pos-mobile  │  │    admin     │
│ React 19 PWA │  │  Expo / RN   │  │  React+Vite  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────►  packages/core  ◄────────┘
              (carrito, impuestos, precios,
               permisos, cola de reintentos)
                          │  HTTPS + JWT
                 ┌────────▼─────────┐
                 │  FastAPI (api)   │
                 │  SQLModel + RLS  │
                 └───┬────┬────┬────┘
                     │    │    │
          ┌──────────┘    │    └──────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌────────────┐  ┌──────────────┐
    │ Postgres │   │   Redis    │  │  Motor IA    │
    │ 16 (RLS) │   │ cache/cola │  │ + workers    │
    └──────────┘   └────────────┘  └──────────────┘
```

### Multi-tenant

- Una sola base de datos, columna `tenant_id` en **todas** las tablas de negocio.
- **Postgres RLS** obligatorio: `USING (tenant_id = current_setting('app.tenant_id')::uuid)`. La API setea el tenant por transacción; ninguna query puede escapar del filtro.
- Justificación vs. schema-per-tenant: migraciones únicas, costo plano, escala a miles de tenants. RLS da el aislamiento que el schema daría, sin el costo operativo.
- `tenant_id` nunca viene del cliente: se deriva del JWT.

### Localización LATAM

| Pieza | Diseño |
|---|---|
| Dinero | `BIGINT` en unidades menores + `CHAR(3)` de moneda. Nunca float |
| Impuestos | Reglas por línea (`rate`, `inclusive`, `name`), configurables por país. CO: IVA 19% incluido; MX: IVA 16% sumado |
| Identificación fiscal | Campo genérico `tax_id` + tipo (NIT / RFC / RUC / CUIT) |
| Numeración | Prefijo por sucursal, consecutivo por tipo de documento |
| Zona horaria | Por sucursal, no por servidor |
| Idioma | ES/PT/EN por tenant, con fallback |
| Medios de pago | Catálogo por país (efectivo, tarjeta, transferencia, Nequi, Yape, OXXO…) |
| Fiscal | Interfaz `FiscalProvider` con implementación nula hasta fase 4 |

### IA — motor de preguntas

**No texto-a-SQL libre.** El LLM no toca la base de datos.

```
pregunta → LLM (salida estructurada) → validador whitelist
        → compilador a SQL → rol read-only + tenant_id + LIMIT + timeout
        → resultado + narración
```

- **Capa semántica** curada: ~15 métricas (`ventas_netas`, `ticket_promedio`, `margen_bruto`, `unidades`, `rotación`, `días_de_inventario`, `quiebre`) × dimensiones (fecha, sucursal, categoría, producto, cajero, medio de pago, cliente).
- El LLM solo elige métrica + dimensiones + filtros + rango. Si la combinación no está en la whitelist, responde "no lo sé" en vez de alucinar.
- **Insights proactivos** (jobs nocturnos): caída de ventas vs. mismo día de la semana, productos que se agotan según velocidad de venta, margen negativo, cliente que dejó de comprar.
- Costos: modelo pequeño para routing, modelo grande solo para narración; cache por hash de pregunta + tenant.

### Hardware (MVP)

| Dispositivo | Vía |
|---|---|
| Impresora 80mm | Red (TCP 9100) como primario; WebSerial/WebUSB como fallback en Chrome |
| Cajón monedero | Pulso por la impresora (`ESC p`) |
| Lector de barras | HID (se comporta como teclado), cero drivers |
| App móvil | Bluetooth ESC/POS vía Expo dev client |

Báscula y datáfono integrado: fase 4.

### Resiliencia

La venta web es online, pero cada venta lleva **idempotency key** y entra a una cola en IndexedDB si falla la red: se reintenta y no se duplica. La app nativa sí opera offline con SQLite y sincronización por delta.

---

## 6. Modelo de datos (núcleo)

| Tabla | Propósito |
|---|---|
| `tenants` | Negocio. País, moneda, idioma, plan, estado |
| `users` / `memberships` | Usuarios y su rol dentro de un tenant |
| `branches` | Sucursales (dirección, timezone, numeración) |
| `registers` | Cajas físicas por sucursal |
| `shifts` | Turnos: base inicial, cierre, arqueo, diferencia |
| `products` / `variants` / `barcodes` | Catálogo |
| `categories`, `price_lists` | Organización y precios |
| `inventory_levels` | Cache de stock por sucursal/variante |
| `stock_moves` | Kardex append-only: la verdad del inventario |
| `suppliers`, `purchases`, `purchase_lines` | Compras |
| `customers`, `credit_accounts`, `credit_payments` | Fiado |
| `sales`, `sale_lines`, `payments` | Venta con snapshot de nombre, precio e impuesto |
| `promotions` | Descuentos y combos |
| `returns`, `return_lines` | Devoluciones |
| `expenses` | Gastos |
| `cash_movements` | Entradas/salidas de efectivo |
| `subscriptions`, `invoices` | SaaS |
| `ai_queries` | Auditoría de preguntas y costo |
| `audit_log` | Quién hizo qué |

Reglas transversales:
- IDs `UUIDv7` (ordenables por tiempo).
- `created_at` / `updated_at` en UTC.
- **Snapshot en `sale_lines`**: nombre, precio, tasa y monto de impuesto. Una venta vieja nunca cambia si cambia el catálogo.
- `stock_moves` es append-only; `inventory_levels` se recalcula, nunca se edita a mano.

---

## 7. Roadmap

Semana 1 = lunes 9 de noviembre de 2026. Un dev full-time.

### Fase 0 — Fundamentos (semanas 1–2)

| Entregable | Criterio de salida |
|---|---|
| Monorepo, lint, CI, Docker Compose | `docker compose up` levanta api + db + redis |
| Auth multi-tenant (JWT + refresh + Argon2id + PIN cajero) | Login, refresh y logout con tests |
| RLS activo y probado | Test que demuestra que el tenant A no ve datos de B |
| Design system mínimo (botones, inputs, tabla, modal) | Storybook o página de muestra |
| Esqueleto Expo | Login + pantalla vacía corriendo en dispositivo |

**Riesgo:** no empezar features antes de que RLS tenga test. Es el error más caro del proyecto.

### Fase 1 — Núcleo de venta (semanas 3–8)

Catálogo, inventario, venta completa, caja/turnos, tirilla, hardware.

| Entregable | Criterio de salida |
|---|---|
| CRUD catálogo + variantes + códigos de barras | Importar CSV de 500 productos en < 30 s |
| Kardex y stock por sucursal | Venta y compra mueven stock correctamente |
| Pantalla de venta | Escanear → cobrar → imprimir en < 5 s |
| Multi-pago (efectivo/tarjeta/transferencia) | Venta con 2 medios cuadra con el total |
| Caja y turnos | Apertura → ventas → arqueo con diferencia calculada |
| Impresión 80mm + cajón | Tirilla real en impresora de red |
| Expo: venta rápida + escaneo | Vender desde el celular contra la misma API |

### Fase 2 — Negocio completo (semanas 9–14) → **MVP funcional**

Compras, proveedores, clientes/fiado, descuentos, devoluciones, gastos, reportes.

| Entregable | Criterio de salida |
|---|---|
| Compras con costo promedio | Margen por producto correcto tras 2 compras a distinto costo |
| Fiado con cupo y abonos | Cliente bloqueado al exceder cupo |
| Descuentos y combos | Descuento por línea y por total, con trazabilidad |
| Devoluciones | Devolución total/parcial repone stock y caja |
| Gastos | Utilidad del mes = ventas − costo − gastos |
| Reportes base | 6 reportes exportables a CSV |

### Fase 3 — Comercial + IA (semanas 15–18) → **LANZAMIENTO**

| Entregable | Criterio de salida |
|---|---|
| Registro self-service + trial | Un desconocido se registra y vende en < 1 hora sin ayuda |
| Suscripción MercadoPago | Cobro recurrente real en sandbox y producción |
| Panel super-admin | Ver tenants, MRR, suspender, impersonar con log |
| Landing + checkout | Página pública con precios y demo |
| **IA de preguntas (5 métricas)** | "¿Cuánto vendí esta semana?" responde bien en < 4 s |
| Multi-sucursal en UI | 2 sucursales con cajas y reportes separados |

### Fase 4 — Profundidad (semanas 19–26)

- IA: insights proactivos, comparativos, alertas push.
- Fiscal Colombia (DIAN) con proveedor autorizado.
- App móvil completa: impresión Bluetooth, offline con SQLite, sync.
- Restaurante en beta cerrada (mesas, comandas).

### Fase 5 — "Todo en uno" (mes 7 en adelante)

- Verticales farmacia y servicios.
- Marketplace de asesores humanos con IA de apoyo.
- Agregador de POS de terceros.
- White-label.

---

## 8. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Scope creep (el enemigo #1) | Mata el proyecto | Cada fase se lanza; lo nuevo entra a la fase siguiente, no a la actual |
| LATAM fiscal (cada país es un proyecto) | Retraso de meses | FiscalProvider aislado; solo Colombia en fase 4 |
| Internet caído en el local | Ventas perdidas | Cola de reintentos web + offline nativo en la app |
| Impresión: drivers y modelos distintos | Soporte eterno | Red TCP 9100 como primario; lista de impresoras certificadas |
| Costo LLM por tenant | Margen negativo | Capa semántica + cache + modelo pequeño para routing |
| Soporte 1:1 no escala | Tiempo del fundador | Onboarding < 1 hora, ayuda in-app, base de conocimiento desde la semana 1 |
| Competencia con Siigo/Alegra/Tienda POS | Baja conversión | No pelear contabilidad; pelear velocidad + IA + precio |

---

## 9. KPIs

| Métrica | Meta fase 3 |
|---|---|
| Time-to-first-sale | < 60 min |
| Tenants activos | 20 en 90 días |
| MRR | USD 500 a los 90 días |
| Churn mensual | < 5% |
| Ventas sin error | > 99.5% |
| Preguntas IA respondidas bien | > 90% |
| Costo LLM / tenant | < USD 3/mes |

---

## 10. Semana 1 — checklist ejecutable

1. Crear monorepo (pnpm + Turborepo) con `apps/api` y `apps/pos-web`.
2. `docker-compose.yml`: Postgres 16, Redis, api, Caddy.
3. FastAPI: settings, sesión async, Alembic, endpoint `/health`.
4. Modelo `tenants`, `users`, `memberships`, `branches` + migración inicial.
5. RLS + política + **test de aislamiento**.
6. Auth: registro, login, refresh, Argon2id, PIN de cajero.
7. `apps/pos-web`: Vite + TS + Tailwind + router + login funcional.
8. CI: ruff + mypy + pytest + tsc + vitest.
9. `README.md` con arranque en 5 comandos.

---

## 11. ADRs iniciales

| ADR | Decisión | Motivo |
|---|---|---|
| 0001 | Monorepo pnpm + Turborepo | Código de negocio compartido web/móvil |
| 0002 | RLS, no schema-per-tenant | Migraciones únicas, aislamiento equivalente |
| 0003 | Dinero en enteros menores | Evita errores de redondeo en impuestos |
| 0004 | IA sobre capa semántica, no texto-a-SQL | Evita fuga entre tenants y alucinaciones |
| 0005 | Impresión primaria por red TCP 9100 | WebUSB/WebSerial es frágil entre drivers |
| 0006 | Expo desde el inicio | Requisito de producto; comparte `packages/core` |
| 0007 | Snapshot en líneas de venta | Histórico inmutable ante cambios de catálogo |
