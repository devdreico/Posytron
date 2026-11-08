# Posytron — Plan de implementación v1

**Fecha:** 2026-11-08 · **Estado:** borrador para ejecución · **Autor:** Andrei

---

## 1. Resumen ejecutivo

Posytron es un **POS SaaS multi-país (LATAM) y multi-vertical**: el comerciante compra su cuenta dentro del propio software y opera todo su negocio —varias sucursales, cajas y verticales— desde un solo panel.

**Arma de entrada:** la IA que responde el negocio. El comerciante pregunta *"¿qué me está dejando plata?"*, *"¿qué se me va a acabar esta semana?"* y recibe respuesta con números reales de su operación, no un dashboard que hay que aprender a leer.

**Principio de producto:** el software se adapta al negocio, no al revés. Dos cuestionarios (inicial y de procesos) configuran la app; el usuario nunca ve un módulo que no le sirve.

**Lo que Posytron NO es (fase 1):** no es un ERP contable, no reemplaza a Siigo en contabilidad formal y no emite factura electrónica DIAN hasta fase 5.

**Restricción de realidad:** "todos los POS en uno + IA + asesoría" es un producto de 12–18 meses. El plan está cortado en fases lanzables; cada una se puede vender.

---

## 2. Decisiones cerradas

| # | Decisión | Valor |
|---|---|---|
| 1 | Alcance | Multi-vertical + agregador de terceros + white-label, por fases |
| 2 | Mercado | LATAM operativo; Colombia como playa inicial |
| 3 | Vertical MVP | Retail / minimarket |
| 4 | Plataforma | **Un solo sitio web**: React 19 + Vite + PWA instalable. Sin app nativa |
| 5 | Stack | React 19 + Vite + TS + Tailwind / FastAPI + SQLModel + Postgres |
| 6 | DIAN | Fase 5, con proveedor tecnológico autorizado |
| 7 | Cobro | Suscripción self-service, MercadoPago |
| 8 | IA | Copiloto + insights + agentes por vertical + marketplace de asesores (por fases) |
| 9 | Hardware MVP | Impresora térmica 80mm, lector HID, cajón monedero |
| 10 | Sucursales | Multi-sucursal y multi-caja desde el modelo de datos |
| 11 | Diferenciador | IA que responde el negocio |
| 12 | Equipo | 1 dev full-time + IA como par |
| 13 | Acceso | Nombre de negocio + contraseña + código de 6 dígitos (TOTP) |
| 14 | Onboarding | Cuestionario inicial obligatorio, solo en la primera entrada |
| 15 | Navegación | Toolbar izquierda + hero con exactamente 6 indicadores |
| 16 | Verticales | Se activan por el cuestionario de Procesos, no por menú |
| 17 | Empleados | Slug del negocio + usuario + PIN de 4–6 dígitos |
| 18 | Glifo | Paramétrico: 10 arquetipos, mínimo 30 combinaciones |
| 19 | URL | `posytron.com/{slug}` |
| 20 | Multi-POS | Varios POS activos a la vez, mismo precio |
| 21 | Móvil | La misma PWA, instalable desde el navegador |

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
- Un POS/vertical activado no cambia el precio: el valor está en el flujo, no en el módulo.

---

## 4. Alcance

Todos los módulos se agrupan en **6 hubs** (ver §6.8). Nada vive fuera de esos 6 accesos.

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
| PWA | Instalable, offline shell, escaneo por cámara, impresión Bluetooth |

### Fuera del MVP

Restaurante (mesas/KDS), farmacia (lotes/INVIMA), servicios (agenda), marketplace de asesores, agregador de POS de terceros, white-label, facturación electrónica.

---

## 5. Arquitectura técnica

### Principio: un solo artefacto web

Todo lo que el usuario ve —login, onboarding, hero, 6 hubs, panel super-admin— compila a **un único build de Vite**, servido en un único dominio. Sin microfrontends, sin deploy separado del admin.

La API vive en el mismo dominio bajo `/api`, detrás de un reverse proxy. Mismo origen ⇒ sin CORS, cookies `SameSite=Lax` y CSRF simple por header.

Lenguajes: **TypeScript** en todo el frontend y paquetes compartidos; **Python** en la API; **SQL** en migraciones. Nada más.

**Todo el esfuerzo va al sitio web.** No hay app nativa, no hay App Store ni Play Store. En móvil, el usuario abre el sitio desde el navegador y lo instala como PWA ("Añadir a pantalla de inicio"). Es la misma base de código, el mismo deploy y el mismo contrato de API.

Requisitos PWA (fase 0, no fase 5):

| Pieza | Implementación |
|---|---|
| Manifest | Nombre, iconos 192/512, `display: standalone`, `theme_color` |
| Service worker | Workbox: precache del shell, stale-while-revalidate en catálogo |
| Offline de venta | Cola de ventas en IndexedDB + idempotency key |
| Instalación | Prompt propio a los 2 usos, no al primer segundo |
| Actualización | Aviso "nueva versión disponible" + recarga controlada |
| Impresión | Red (TCP 9100) en Android/desktop; Web Bluetooth para térmicas BT en Android |

**Límite real:** iOS Safari no expone Web Bluetooth ni Web Serial. En iPhone/iPad la impresión térmica no es posible desde la PWA; se resuelve con impresión en red o PDF. La recomendación comercial es tablet Android.

### Monorepo

```
Posytron/
├── apps/
│   ├── web/            EL SITIO ÚNICO — React 19 + Vite + TS + Tailwind + PWA
│   │                   login, onboarding, hero, 6 hubs, super-admin
│   └── api/            FastAPI + SQLModel
├── packages/
│   ├── core/           Lógica TS: carrito, impuestos, precios, permisos, cola
│   ├── glyphs/         Generador SVG de la representación del negocio
│   ├── ui/             Design system
│   └── sdk/            Cliente API generado desde OpenAPI
├── infra/              Docker Compose, migraciones, CI, backups
└── docs/               Este plan + ADRs
```

Gestión: **pnpm workspaces + Turborepo**. Backend Python con pipeline aparte (ruff + mypy + pytest).

> **Un solo target.** No existe `apps/mobile`. La experiencia móvil es la PWA: mismo código, mismo build, misma URL.

### Diagrama

```
┌─────────────────────────────────────────────────────┐
│                   EL SITIO ÚNICO                    │
│  apps/web (React 19 + Vite) — un solo build         │
│  /  /registro  /{slug}  /{slug}/*  /admin          │
│                                                      │
│  packages/ui    packages/glyphs    packages/core     │
└────────────────────────┬────────────────────────────┘
                         │  /api (mismo origen, JWT)
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

   PWA: el mismo build, instalado desde el navegador
```

### Multi-tenant

- Una sola base de datos, columna `tenant_id` en **todas** las tablas de negocio.
- **Postgres RLS** obligatorio: `USING (tenant_id = current_setting('app.tenant_id')::uuid)`. La API setea el tenant por transacción.
- Justificación vs. schema-per-tenant: migraciones únicas, costo plano, escala a miles de tenants.
- `tenant_id` nunca viene del cliente: se deriva del JWT.

### Localización LATAM

| Pieza | Diseño |
|---|---|
| Dinero | `BIGINT` en unidades menores + `CHAR(3)` de moneda. Nunca float |
| Impuestos | Reglas por línea (`rate`, `inclusive`, `name`). CO: IVA 19% incluido; MX: IVA 16% sumado |
| Identificación fiscal | `tax_id` genérico + tipo (NIT / RFC / RUC / CUIT) |
| Numeración | Prefijo por sucursal, consecutivo por tipo de documento |
| Zona horaria | Por sucursal, no por servidor |
| Idioma | ES/PT/EN por tenant, con fallback |
| Medios de pago | Catálogo por país (efectivo, tarjeta, transferencia, Nequi, Yape, OXXO…) |
| Fiscal | Interfaz `FiscalProvider` con implementación nula hasta fase 5 |

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
| Móvil Android | Web Bluetooth (ESC/POS) o impresora de red |
| iOS | Solo impresión en red o PDF: Safari no expone Bluetooth/Serial |

Báscula y datáfono integrado: fase 5.

### Resiliencia

La venta es online, pero cada venta lleva **idempotency key** y entra a una cola en IndexedDB si falla la red: se reintenta y no se duplica. El service worker precachea el shell y el catálogo, así que la app abre y navega aunque no haya internet; solo la escritura requiere conexión.

---

## 6. Arquitectura del POS

### 6.1 Mapa de rutas del sitio único

| Ruta | Pantalla | Guarda |
|---|---|---|
| `/` | Login: nombre de negocio, contraseña, código de 6 dígitos | Público |
| `/registro` | Crear cuenta: slug, email, contraseña | Público |
| `/{slug}` | Resuelve estado y redirige: onboarding, setup o hero | Autenticado |
| `/{slug}/onboarding` | Cuestionario inicial | `onboarding_pending` |
| `/{slug}/setup` | "Todo listo — Preparando tu negocio digital" | `setup_running` |
| `/{slug}/caja` | Hub Caja | `active` |
| `/{slug}/inventario` | Hub Inventario | `active` |
| `/{slug}/administracion` | Hub Administración | `active` |
| `/{slug}/red` | Hub Red Externa | `active` |
| `/{slug}/clientes` | Hub Clientes | `active` |
| `/{slug}/procesos` | Hub Procesos | `active` |
| `/{slug}/procesos/cuestionario` | Cuestionario de procesos | `active` |
| `/admin` | Panel super-admin SaaS | Rol `superadmin` |

El slug es la raíz de todo: `posytron.com/minimarket-ana/caja`. Un slug reservado o inexistente devuelve 404, nunca el login.

Code-splitting por ruta. Un solo `index.html`, un solo deploy.

### 6.2 Máquina de estados del tenant

```
provisioned ──► onboarding_pending ──► setup_running ──► active
                      │                     │
                      └──── abandono ───────┘
                            (retoma donde iba)
```

Un middleware de frontend resuelve el estado en cada navegación y redirige. El estado vive en `tenants.status`, no en el cliente.

### 6.3 Login (pantalla MAIN)

Tres campos, sin excepciones:

| Campo | Tipo | Regla |
|---|---|---|
| Nombre del negocio | Texto | Slug único global: `[a-z0-9-]{3,30}`, sin espacios |
| Contraseña | Password | Argon2id, mínimo 10 caracteres |
| Código de 6 dígitos | TOTP | RFC 6238, ventana ±1 (30 s), un solo uso |

**Slug del negocio.** Es a la vez el campo de login y la URL: `posytron.com/minimarket-ana`. Se reservan ~40 slugs (admin, api, app, login, soporte, precios…). Sin mayúsculas, sin tildes, sin ñ. Inmutable después del registro: cambiarlo rompe la URL y el hábito del usuario.

Comportamiento:

- **Si el negocio no existe → error genérico**: "Nombre de negocio o credenciales incorrectas". Nunca se revela si el tenant existe (anti-enumeración).
- Rate limit por nombre de negocio + IP: 5 intentos / 15 min, luego espera exponencial.
- El código se pide **siempre**, incluso antes de validar la contraseña, para que el tiempo de respuesta no filtre información.
- Sesión: access token 15 min + refresh 30 días rotativo, en cookie `HttpOnly`.
- Si la cuenta existe → se resuelve el estado y se redirige a `/{slug}/onboarding` (primera vez) o `/{slug}`.
- Recuperación: el código de 6 dígitos es también el canal de recuperación de contraseña.

**Dos tipos de sesión:**

| Actor | Campos | Después del login |
|---|---|---|
| Administrador | slug + contraseña + TOTP | `/{slug}/onboarding` (primera vez) o `/{slug}` |
| Empleado (cajero, supervisor) | slug + usuario + PIN 4–6 dígitos | Directo a `/{slug}/caja`, sin cuestionarios |

El empleado nunca ve el hero ni los 6 hubs completos: su toolbar se limita a los hubs con permiso. El PIN se hashea con Argon2id, tiene bloqueo tras 5 intentos y se rota desde Administración. El administrador puede exigir TOTP también a supervisores.

### 6.4 Cuestionario inicial (`/{slug}/onboarding`)

Se muestra **solo la primera entrada**. Cuatro pasos, autoguardado por paso, < 3 minutos.

| Bloque | Campos | Para qué se usa |
|---|---|---|
| Tú | Nombre, apellido, rol (dueño/administrador) | Saludo del hero, permisos |
| Tu negocio | Nombre comercial, tipo de negocio, tamaño, # empleados | **Glifo**, preset de módulos, recomendación de POS |
| Ubicación | País, ciudad, dirección, zona horaria | Moneda, impuestos, numeración, tirilla |
| Operación | Horario, medios de pago, ¿maneja inventario?, ¿vende a crédito?, ¿domicilio/delivery? | Hubs visibles, métodos de pago por defecto, alertas |

Reglas:

- Todo obligatorio salvo los campos marcados como opcionales (dirección exacta).
- Se puede abandonar y retomar: cada paso persiste al avanzar.
- Al terminar se genera `business_profile` (JSON versionado) y el tenant pasa a `setup_running`.
- El cuestionario **no** se vuelve a mostrar. Se puede editar después desde Administración.

### 6.5 Pantalla de preparación (`/{slug}/setup`)

"Todo listo — Preparando tu negocio digital".

Los pasos son **reales**, no una animación falsa. Si algo falla, se muestra y se reintenta:

1. Crear sucursal y caja principal.
2. Aplicar reglas de impuesto y moneda del país.
3. Crear lista de precios y medios de pago.
4. Sembrar categorías base según el tipo de negocio.
5. Generar el glifo del negocio.
6. Activar los hubs que aplican.

Duración objetivo: < 8 segundos. Al terminar → `/{slug}`.

### 6.6 Hero y toolbar

**Toolbar izquierda:** riel fijo de 72 px con 6 iconos + avatar. Se expande a 240 px con etiquetas. En móvil colapsa a barra inferior.

**Hero:** glifo geométrico + nombre del negocio + exactamente **6 tarjetas indicador**, ni una más.

| # | Indicador | Métrica viva | Redirige a |
|---|---|---|---|
| 1 | Caja | Ventas de hoy / turno abierto | `/{slug}/caja` |
| 2 | Inventario | Productos bajo mínimo | `/{slug}/inventario` |
| 3 | Administración | Estado del plan / alertas | `/{slug}/administracion` |
| 4 | Red Externa | Proveedores pendientes / por pagar | `/{slug}/red` |
| 5 | Clientes | Cuentas por cobrar / nuevos del mes | `/{slug}/clientes` |
| 6 | Procesos | POS activos / recomendados | `/{slug}/procesos` |

Regla dura: si un hub no aplica al negocio, la tarjeta se muestra **inactiva con candado y motivo** ("no manejas inventario"), nunca se elimina. El mapa mental del usuario se mantiene estable y siempre son 6.

### 6.7 Glifo geométrico del negocio

Representación abstracta, **paramétrica y generada por código** (nunca ilustración encargada ni imagen de stock).

**10 arquetipos base:**

| # | `archetype` | Para |
|---|---|---|
| 1 | `kiosk_single` | Tienda de barrio, quiosco, puesto |
| 2 | `retail_grid` | Minimarket, superete |
| 3 | `supermarket_aisles` | Supermercado, autoservicio |
| 4 | `restaurant_tables` | Restaurante, comida corrida |
| 5 | `cafe_bar_counter` | Cafetería, bar, panadería con mesas |
| 6 | `bakery_racks` | Panadería, pastelería |
| 7 | `pharmacy_shelves` | Farmacia, droguería |
| 8 | `services_rooms` | Barbería, spa, estética, consultorio |
| 9 | `workshop_bays` | Taller mecánico, motos, cerrajería |
| 10 | `warehouse_bulk` | Distribuidora, ferretería, depósito |

**Combinaciones:** 10 arquetipos × 3 densidades (compacta / media / amplia) × 4 paletas = **120 combinaciones**, muy por encima del mínimo de 30.

| Token | Origen | Efecto |
|---|---|---|
| `archetype` | tipo de negocio | Forma base del plano |
| `density` | # empleados y tamaño | 1–3: cantidad y espaciado de elementos |
| `palette` | sector | 4 paletas, contraste AA |
| `accent` | rasgos del cuestionario | Delivery, crédito, multi-sucursal añaden un elemento distintivo |
| `seed` | `hash(tenant_id)` | Variación determinista: dos minimarket no se ven idénticos |

Especificación de render: SVG plano, 2–3 colores, trazos geométricos, viewBox 800×400, < 8 KB, sin texto. Componente `<BusinessGlyph profile={...} />` en `packages/glyphs`.

**Criterios de calidad (obligatorios):**

- Se lee como un **plano**, no como un dibujo ni un icono.
- Geometría pura: rectángulos, círculos, líneas. Cero degradados, cero sombras, cero 3D.
- Agrupa los elementos como un mapa de zonas (venta, almacén, atención), no como una escena.
- A 320 px de ancho sigue siendo legible: máximo 40 primitivas por glifo.
- Determinista: mismo perfil ⇒ mismo glifo, en cualquier dispositivo.
- Accesible: `role="img"` con un `aria-label` que describa el tipo de negocio.

### 6.8 Los 6 hubs

| Hub | Contiene | Módulos que absorbe |
|---|---|---|
| **Caja** | Venta, turnos, arqueo, movimientos de efectivo, devoluciones | Ventas, caja y turnos, devoluciones, descuentos en venta |
| **Inventario** | Catálogo, stock, kardex, ajustes, mínimos, códigos de barras | Catálogo e inventario, ajustes |
| **Administración** | Empresa, sucursales, usuarios y roles, impuestos, plan y facturación, gastos, reportes | Gastos, reportes, configuración, SaaS |
| **Red Externa** | Proveedores, órdenes de compra, recepción, integraciones, asesores | Compras y proveedores, integraciones |
| **Clientes** | CRM, historial, fiado, cupos, abonos, fidelización | Clientes + fiado |
| **Procesos** | Verticales/POS activos, cuestionario de procesos, automatizaciones | Motor de recomendación |

Cada hub se construye con el mismo patrón: cabecera con 3 métricas, barra de acciones, tabla o tablero, y buscador. Nada de menús anidados de más de 2 niveles.

### 6.9 Procesos: cuestionario y motor de recomendación

Primera entrada a `/{slug}/procesos` ⇒ cuestionario de procesos. Captura **qué hace el administrador para que el negocio funcione**, no qué software quiere.

- **Catálogo de tareas** (~40), agrupadas en 6 etapas: comprar, recibir/almacenar, producir/preparar, vender, cobrar, cerrar el día.
- **Matriz `pos_capabilities`**: ~25 capacidades (mesas, comandas, lotes, vencimientos, agenda, comisiones, báscula, seriales, recetas, delivery…) × ~8 POS candidatos (retail, restaurante, farmacia, servicios, ferretería, panadería, licorería, cafetería).
- **Scoring:** coincidencia ponderada tarea→capacidad + reglas duras. Ejemplo de regla dura: si marca "atiendo mesas" ⇒ restaurante siempre en el top 3.
- **Salida:** top 3 con porcentaje y explicación legible ("coincide en 8 de tus 10 procesos: mesas, comandas, división de cuenta").
- **Activación:** un botón habilita el bundle del POS. Se pueden activar varios; el precio no cambia.
- Explicabilidad obligatoria: nunca una caja negra. Cada recomendación muestra qué tareas la justifican.
- Reejecutable desde Procesos cuando el negocio cambie.

### 6.10 Contratos de datos

```jsonc
// business_profile v1
{
  "admin":    { "first_name": "…", "last_name": "…", "role": "owner" },
  "business": { "name": "…", "type": "minimarket", "size": "small", "employees": 3 },
  "location": { "country": "CO", "city": "…", "timezone": "America/Bogota" },
  "ops":      { "inventory": true, "credit": false, "delivery": false,
                "payment_methods": ["cash", "card"] }
}
```

```jsonc
// process_profile v1
{
  "tasks": ["scan_barcode", "receive_stock", "sell_credit", "…"],
  "stage_answers": { "comprar": ["…"], "vender": ["…"] },
  "recommendations": [
    { "pos": "retail", "score": 0.92, "matched": ["scan_barcode", "…"] }
  ]
}
```

Ambos son versionados; un cambio de esquema obliga a migración, no a `if` dispersos.

### 6.11 Casos límite y guardas

| Caso | Comportamiento |
|---|---|
| Negocio inexistente | Error genérico + misma latencia |
| Código expirado o erróneo | Error en el campo del código, sin revelar cuál de los 3 falló |
| Onboarding abandonado | Se retoma en el paso donde quedó |
| Setup con un paso fallido | Reintento visible; no se avanza a `/{slug}` a medias |
| Sesión expirada durante una venta | La venta se conserva en IndexedDB y se reenvía tras re-login |
| Super-admin entrando a un tenant | Impersonación con banner permanente y registro en `audit_log` |
| Usuario empleado | Entra con nombre de negocio + su usuario; sin cuestionarios |

---

## 7. Modelo de datos (núcleo)

| Tabla | Propósito |
|---|---|
| `tenants` | Negocio. País, moneda, idioma, plan, **status** |
| `business_profiles` | Resultado del cuestionario inicial (JSONB versionado) |
| `process_profiles` | Resultado del cuestionario de procesos (JSONB versionado) |
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
| `pos_bundles` / `tenant_pos` | POS disponibles y POS activados por tenant |
| `subscriptions`, `invoices` | SaaS |
| `ai_queries` | Auditoría de preguntas y costo |
| `audit_log` | Quién hizo qué |

Reglas transversales:
- IDs `UUIDv7` (ordenables por tiempo).
- `created_at` / `updated_at` en UTC.
- **Snapshot en `sale_lines`**: nombre, precio, tasa y monto de impuesto. Una venta vieja nunca cambia si cambia el catálogo.
- `stock_moves` es append-only; `inventory_levels` se recalcula, nunca se edita a mano.

---

## 8. Roadmap

Semana 1 = lunes 9 de noviembre de 2026. Un dev full-time.

### Fase 0 — Fundamentos (semanas 1–2)

| Entregable | Criterio de salida |
|---|---|
| Monorepo, lint, CI, Docker Compose | `docker compose up` levanta api + db + redis |
| Auth: nombre de negocio + contraseña + OTP de 6 dígitos | Login, refresh y logout con tests |
| Máquina de estados del tenant | Middleware redirige correctamente en los 4 estados |
| RLS activo y probado | Test que demuestra que el tenant A no ve datos de B |
| Design system mínimo (botones, inputs, tabla, modal) | Página de muestra usable |
| Shell PWA: manifest, service worker, iconos | Instalable en Android y desktop |
| Esqueleto del sitio único con mapa de rutas | `npm run build` produce **un** artefacto |

### Fase 1 — Experiencia de entrada (semanas 3–6)

| Entregable | Criterio de salida |
|---|---|
| Pantalla de login completa | 3 campos, errores genéricos, rate limit |
| Cuestionario inicial (4 pasos, autosave) | Abandonar y retomar funciona |
| Pantalla de preparación con pasos reales | < 8 s, reintento ante fallo |
| Glifo geométrico (`packages/glyphs`) | 10 arquetipos × 3 densidades × 4 paletas |
| Hero + toolbar con 6 tarjetas | Exactamente 6, con métricas reales |
| Shell de los 6 hubs | Navegación completa con estados vacíos, usable en 375 px |

**Riesgo:** no empezar features de venta antes de que el flujo de entrada esté cerrado. Es la primera impresión del producto.

### Fase 2 — Núcleo de venta (semanas 7–12)

Catálogo, inventario, venta completa, caja/turnos, tirilla, hardware.

| Entregable | Criterio de salida |
|---|---|
| CRUD catálogo + variantes + códigos de barras | Importar CSV de 500 productos en < 30 s |
| Kardex y stock por sucursal | Venta y compra mueven stock correctamente |
| Pantalla de venta | Escanear → cobrar → imprimir en < 5 s |
| Multi-pago (efectivo/tarjeta/transferencia) | Venta con 2 medios cuadra con el total |
| Caja y turnos | Apertura → ventas → arqueo con diferencia calculada |
| Impresión 80mm + cajón | Tirilla real en impresora de red |
| PWA en móvil | Instalar, vender y escanear con la cámara del celular |

### Fase 3 — Negocio completo (semanas 13–16) → **MVP funcional**

| Entregable | Criterio de salida |
|---|---|
| Compras con costo promedio | Margen por producto correcto tras 2 compras a distinto costo |
| Fiado con cupo y abonos | Cliente bloqueado al exceder cupo |
| Descuentos y combos | Descuento por línea y por total, con trazabilidad |
| Devoluciones | Devolución total/parcial repone stock y caja |
| Gastos | Utilidad del mes = ventas − costo − gastos |
| Reportes base | 6 reportes exportables a CSV |

### Fase 4 — Procesos + IA + comercial (semanas 17–20) → **LANZAMIENTO**

| Entregable | Criterio de salida |
|---|---|
| Cuestionario de procesos + motor de recomendación | Top 3 explicado; activar un POS cambia la UI |
| **IA de preguntas (5 métricas)** | "¿Cuánto vendí esta semana?" responde bien en < 4 s |
| Registro self-service + trial | Un desconocido se registra y vende en < 1 hora sin ayuda |
| Suscripción MercadoPago | Cobro recurrente real en sandbox y producción |
| Panel super-admin | Ver tenants, MRR, suspender, impersonar con log |
| Landing + checkout | Página pública con precios y demo |
| Multi-sucursal en UI | 2 sucursales con cajas y reportes separados |

### Fase 5 — Profundidad (semanas 21–28)

- IA: insights proactivos, comparativos, alertas push.
- Fiscal Colombia (DIAN) con proveedor autorizado.
- Restaurante en beta cerrada (mesas, comandas).
- Impresión térmica Bluetooth en Android y modo offline robusto.

### Fase 6 — "Todo en uno" (mes 8 en adelante)

- Verticales farmacia y servicios.
- Marketplace de asesores humanos con IA de apoyo.
- Agregador de POS de terceros.
- White-label.

---

## 9. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Scope creep (el enemigo #1) | Mata el proyecto | Cada fase se lanza; lo nuevo entra a la fase siguiente, no a la actual |
| LATAM fiscal (cada país es un proyecto) | Retraso de meses | `FiscalProvider` aislado; solo Colombia en fase 5 |
| Internet caído en el local | Ventas perdidas | Cola de reintentos en IndexedDB + shell precacheado |
| iOS no expone Bluetooth ni Serial | Sin impresión térmica en iPhone/iPad | Estandarizar tablet Android; en iOS, red o PDF |
| PWA con almacenamiento limitado | Ventas perdidas al limpiar caché | Sincronización inmediata; la cola es respaldo, no fuente de verdad |
| Impresión: drivers y modelos distintos | Soporte eterno | Red TCP 9100 como primario; lista de impresoras certificadas |
| Costo LLM por tenant | Margen negativo | Capa semántica + cache + modelo pequeño para routing |
| El glifo se vuelve un proyecto de arte | Semanas perdidas | Paramétrico y abstracto, 6 arquetipos, sin ilustración |
| El cuestionario de procesos sesga a un solo POS | Mala activación | Scoring explicable + permitir activar cualquier POS manualmente |
| Soporte 1:1 no escala | Tiempo del fundador | Onboarding < 1 hora, ayuda in-app, base de conocimiento desde la semana 1 |
| Competencia con Siigo/Alegra/Tienda POS | Baja conversión | No pelear contabilidad; pelear velocidad + IA + precio |

---

## 10. KPIs

| Métrica | Meta fase 4 |
|---|---|
| Time-to-first-sale | < 60 min |
| Onboarding completado | > 80% de registros |
| Tenants activos | 20 en 90 días |
| MRR | USD 500 a los 90 días |
| Churn mensual | < 5% |
| Ventas sin error | > 99.5% |
| Preguntas IA respondidas bien | > 90% |
| Costo LLM / tenant | < USD 3/mes |

---

## 11. Semana 1 — checklist ejecutable

1. Crear monorepo (pnpm + Turborepo) con `apps/api` y `apps/web`.
2. `docker-compose.yml`: Postgres 16, Redis, api, Caddy.
3. FastAPI: settings, sesión async, Alembic, endpoint `/health`.
4. Modelo `tenants`, `users`, `memberships`, `branches` + migración inicial.
5. RLS + política + **test de aislamiento**.
6. Auth de 3 factores: slug de negocio, Argon2id, OTP de 6 dígitos.
7. `apps/web`: Vite + TS + Tailwind + router con el mapa de rutas de §6.1 + login funcional.
8. CI: ruff + mypy + pytest + tsc + vitest.
9. `README.md` con arranque en 5 comandos.

---

## 12. ADRs iniciales

| ADR | Decisión | Motivo |
|---|---|---|
| 0001 | Monorepo pnpm + Turborepo | Código de negocio compartido web/móvil |
| 0002 | RLS, no schema-per-tenant | Migraciones únicas, aislamiento equivalente |
| 0003 | Dinero en enteros menores | Evita errores de redondeo en impuestos |
| 0004 | IA sobre capa semántica, no texto-a-SQL | Evita fuga entre tenants y alucinaciones |
| 0005 | Impresión primaria por red TCP 9100 | WebUSB/WebSerial es frágil entre drivers |
| 0006 | PWA única, sin app nativa | Un solo código, un solo deploy, cero tiendas de apps |
| 0007 | Snapshot en líneas de venta | Histórico inmutable ante cambios de catálogo |
| 0008 | Un solo build web, admin incluido | Un dominio, un deploy, sin CORS ni drift de versiones |
| 0009 | Glifo paramétrico en SVG | Personalización a costo cero y sin dependencia de diseño |
| 0010 | Login con slug de negocio, no email | El usuario recuerda su negocio, no un correo |
| 0011 | TOTP en app autenticadora | Sin costo por mensaje y funciona sin internet |
| 0012 | Slug como URL y como credencial | Una sola cosa que recordar; marca y SEO |
| 0013 | Glifo de 10 arquetipos, no ilustraciones | Personalización real sin depender de diseño |
| 0014 | Empleados con PIN, sin email | El cajero no tiene correo corporativo |
