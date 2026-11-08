# Posytron — Plan de implementación v1

**Fecha:** 2026-11-08 · **Estado:** borrador para ejecución · **Autor:** Andrei

---

## 1. Resumen ejecutivo

Posytron es un **POS SaaS multi-país (LATAM) y multi-vertical**. El comerciante compra su cuenta dentro del propio software y opera todo su negocio —sucursales, cajas y verticales— desde un solo sitio web instalable.

**Tres ideas que lo definen:**

1. **El software se adapta al negocio.** Dos cuestionarios (inicial y de procesos) configuran la app: qué herramientas ve primero, qué POS se activan y qué glifo lo representa.
2. **Gemelo digital.** La IA entiende todo el POS y lo modifica por voz: "cámbiame el precio de la gaseosa a 2.500", "ciérrame la caja", "pásame 20 unidades al mostrador". El negocio tiene un clon operativo dentro del software.
3. **400 herramientas.** Todas disponibles en catálogo; los cuestionarios filtran y ponen adelante las que impactan a ese negocio.

**Backend:** Supabase (Postgres + Auth + RLS + Edge Functions + Storage + Realtime + pgvector + Vault).

**Lo que Posytron NO es (fase 1):** no es un ERP contable, no reemplaza a Siigo y no emite factura electrónica DIAN hasta fase 5.

**Restricción de realidad:** 400 herramientas, IA por voz y multi-vertical es un producto de 14–18 meses. El plan corta fases lanzables: cada una se vende.

---

## 2. Decisiones cerradas

| # | Decisión | Valor |
|---|---|---|
| 1 | Alcance | Multi-vertical + agregador de terceros + white-label, por fases |
| 2 | Mercado | LATAM operativo; Colombia como playa inicial |
| 3 | Vertical MVP | Retail / minimarket |
| 4 | Plataforma | **Un solo sitio web**: React 19 + Vite + PWA instalable |
| 5 | Backend | **Supabase**: Postgres, Auth, RLS, Edge Functions, Storage, Realtime |
| 6 | DIAN | Fase 5, con proveedor tecnológico autorizado |
| 7 | Cobro | Suscripción self-service con MercadoPago |
| 8 | Acceso | Nombre de negocio (slug) + contraseña + TOTP de 6 dígitos |
| 9 | Empleados | Slug + usuario + PIN de 4–6 dígitos |
| 10 | Onboarding | Cuestionario inicial obligatorio, solo la primera entrada |
| 11 | Navegación | Toolbar izquierda + hero con exactamente 6 indicadores |
| 12 | Verticales | Se activan por el cuestionario de Procesos |
| 13 | Glifo | Paramétrico: 10 arquetipos × 3 densidades × 4 paletas |
| 14 | URL | `posytron.com/{slug}` |
| 15 | Multi-POS | Varios POS activos a la vez, mismo precio |
| 16 | Herramientas | 400, todas en catálogo; los cuestionarios las priorizan |
| 17 | IA | Nativa + BYOK (API key propia por tenant) |
| 18 | IA de voz | Push-to-talk, Web Speech API con fallback a Whisper |
| 19 | Planes | Free / Pro / Premium |
| 20 | Equipo | 1 dev full-time + IA como par |
| 21 | IA incluida | Google Gemini: Flash para routing, Pro para narración |
| 22 | Cuota IA | Ilimitada con fair use (150/día por tenant, 20/hora por usuario) |
| 23 | Plan Free | Demo precargada de solo lectura, sin datos reales |

---

## 3. Modelo de negocio

### Planes

| | **Free** | **Pro** | **Premium** |
|---|---|---|---|
| Precio | COP 0 | COP 79.000/mes por sucursal | COP 149.000/mes por sucursal |
| Cuenta y login | ✅ | ✅ | ✅ |
| Datos reales | ❌ (solo demo) | ✅ | ✅ |
| Herramientas POS | ❌ | **Todas** | **Todas** |
| Empleados | ❌ | 3 | 10 |
| Sucursales | ❌ | 1 incluida | 1 incluida |
| Caja extra | — | COP 25.000 | COP 25.000 |
| IA Posytron incluida | ❌ | ❌ (add-on COP 29.000) | ✅ Ilimitada con fair use |
| BYOK (API key propia) | ❌ | ✅ gratis | ✅ |
| Soporte | — | Email 48 h | Email 24 h + onboarding guiado |

- **Free existe para probar el producto**, no para operar: cuenta creada, tour, datos de ejemplo de solo lectura. Se configura todo, pero no se puede vender.
- **Anual:** 2 meses gratis en Pro y Premium.
- **Empleado adicional:** COP 9.000/mes, solo en Premium (Pro tope 3).
- **Fair use IA:** la IA de Premium es ilimitada en la práctica. El límite técnico es 150 consultas/día por tenant y 20/hora por usuario; al superarlo se pide espera o cambio a BYOK. Un tenant que triplique la mediana durante 7 días pasa a revisión manual, no a bloqueo automático.
- **Proveedor por defecto:** Google Gemini — modelo Flash para routing y consultas simples, modelo Pro para narración y razonamiento. Configurable, porque BYOK permite cualquier proveedor.
- **Free:** entra con un negocio de ejemplo precargado (minimarket con 60 productos, ventas y clientes ficticios). Puede navegar los 6 hubs, probar la IA en modo demostración y ver el catálogo de 400 herramientas. No puede crear datos reales ni vender.
- **BYOK nunca es letra muerta:** si el cliente trae su key, la IA le cuesta cero a Posytron y el plan Pro deja de necesitar el add-on.

### Ciclo de pago (MercadoPago)

```
/registro → cuenta Free → /{slug}/administracion/plan
   → Checkout MercadoPago (preapproval) → webhook
   → activa plan → email con magic link de acceso
   → primer login del admin → cuestionario → setup
```

- **Preapproval** (suscripción recurrente) para Pro y Premium; Checkout Pro como fallback.
- Webhook idempotente en Edge Function con `--no-verify-jwt`, validando firma `x-signature`.
- Al confirmarse el pago se envía al correo del admin un **magic link** de un solo uso. Nunca se envía contraseña en texto plano.
- Dunning: reintento a los 1 / 3 / 7 días → solo lectura a los 15 → suspensión a los 30 (datos conservados 90 días).
- Degradación: al vencer, la cuenta cae a Free conservando datos en solo lectura.

### Precio por país (ancla USD 19–35 por sucursal)

| País | Moneda | Pro / mes | Premium / mes |
|---|---|---|---|
| Colombia | COP | 79.000 | 149.000 |
| México | MXN | 399 | 749 |
| Perú | PEN | 69 | 129 |
| Chile | CLP | 19.900 | 37.900 |
| Argentina | USD | 19 | 35 |

---

## 4. Alcance

Todos los módulos se agrupan en **6 hubs** (§6.8). Nada vive fuera de esos 6 accesos.

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
| Herramientas | 400 utilidades catalogadas y ejecutables |
| IA | Gemelo digital, voz, tool calling, BYOK |
| SaaS | Free/Pro/Premium, MercadoPago, invitaciones, panel super-admin |
| PWA | Instalable, offline shell, escaneo por cámara, impresión Bluetooth |

### Fuera del MVP

Restaurante (mesas/KDS), farmacia (lotes/INVIMA), servicios (agenda), marketplace de asesores, agregador de POS de terceros, white-label, facturación electrónica.

---

## 5. Arquitectura técnica

### 5.1 Principio: un solo artefacto web

Todo lo que el usuario ve —login, onboarding, hero, 6 hubs, panel super-admin— compila a **un único build de Vite**, servido en un único dominio. Sin microfrontends, sin deploy separado del admin.

**No hay servidor propio.** El frontend habla directo con Supabase (PostgREST + Edge Functions). No existe FastAPI, no hay contenedor de API, no hay CORS que administrar: la seguridad vive en RLS.

Lenguajes: **TypeScript** en frontend, paquetes y Edge Functions (Deno); **SQL** en migraciones, RLS y RPC. Nada más.

**PWA, no app nativa.** En móvil se abre desde el navegador y se instala ("Añadir a pantalla de inicio"). Mismo build, mismo deploy.

| Pieza PWA | Implementación |
|---|---|
| Manifest | Nombre, iconos 192/512, `display: standalone`, `theme_color` |
| Service worker | Workbox: precache del shell, stale-while-revalidate en catálogo |
| Offline de venta | Cola en IndexedDB + idempotency key |
| Instalación | Prompt propio a los 2 usos |
| Actualización | Aviso "nueva versión" + recarga controlada |
| Impresión | Red TCP 9100 en Android/desktop; Web Bluetooth para térmicas BT |
| Voz | Web Speech API; fallback MediaRecorder → Whisper |

**Límite real:** iOS Safari no expone Web Bluetooth ni Web Serial. En iPhone/iPad no hay impresión térmica desde la PWA. La recomendación comercial es tablet Android.

### 5.2 Monorepo

```
Posytron/
├── apps/
│   └── web/                  EL SITIO ÚNICO — React 19 + Vite + TS + Tailwind + PWA
│                             login, onboarding, hero, 6 hubs, super-admin
├── packages/
│   ├── core/                 Lógica TS: carrito, impuestos, precios, permisos, cola
│   ├── glyphs/               Generador SVG del glifo del negocio
│   ├── tools/                Contratos y validadores de las 400 herramientas
│   ├── ui/                   Design system
│   └── sdk/                  Cliente tipado de Supabase + RPC
├── supabase/
│   ├── migrations/           Esquema, RLS, RPC, triggers, cron
│   ├── functions/            Edge Functions (Deno)
│   │   ├── auth-login/       slug → email, TOTP, sesión
│   │   ├── pin-login/        empleado: usuario + PIN
│   │   ├── invite-user/      invitaciones y credenciales
│   │   ├── ai-chat/          orquestador del gemelo digital
│   │   ├── ai-voice/         transcripción de audio
│   │   ├── tool-execute/     ejecutor único de herramientas
│   │   ├── mp-checkout/      creación de preapproval
│   │   └── mp-webhook/       activación de plan
│   └── seed/                 Catálogo de herramientas y planes
├── infra/                    CI, backups, scripts
└── docs/                     Este plan + ADRs
```

### 5.3 Supabase como backend

| Pieza | Uso |
|---|---|
| **Postgres 15+** | Toda la verdad del negocio |
| **Auth** | Admin con email/password + MFA TOTP · Empleados con PIN vía Edge Function |
| **RLS** | Aislamiento por tenant en todas las tablas; permisos por rol |
| **Edge Functions (Deno)** | Lógica sensible: login por PIN, IA, pagos, invitaciones |
| **PostgREST + RPC** | CRUD directo del frontend y operaciones transaccionales |
| **Storage** | Logos, fotos de producto, tirillas PDF, CSV de importación |
| **Realtime** | Métricas del hero, sincronización entre cajas |
| **pgvector** | Búsqueda semántica de productos y de herramientas |
| **Vault** | API keys de IA cifradas, jamás expuestas al cliente |
| **pg_cron + pg_net** | Insights nocturnos, dunning, recordatorios |
| **Supavisor** | Pooling de conexiones |

Regla: **el frontend nunca decide permisos**. Toda regla vive en RLS o en una RPC `security definer`.

### 5.4 Diagrama

```
┌──────────────────────────────────────────────────────────┐
│                    EL SITIO ÚNICO (PWA)                  │
│  apps/web — React 19 + Vite, un solo build               │
│  /  /registro  /{slug}  /{slug}/*  /admin                │
│  packages/ui · glyphs · tools · core                     │
└───────────────┬──────────────────────────┬───────────────┘
                │ supabase-js (JWT)        │ fetch /functions
                ▼                          ▼
     ┌────────────────────┐      ┌──────────────────────┐
     │ PostgREST + RLS    │      │  Edge Functions      │
     │ CRUD y RPC         │      │  login · IA · pagos  │
     └─────────┬──────────┘      └──────────┬───────────┘
               │                            │
               └──────────┬─────────────────┘
                          ▼
              ┌────────────────────────┐
              │   Postgres (Supabase)  │
              │  RLS · pgvector · cron │
              │  Vault · Realtime      │
              ├────────────────────────┤
              │ Storage · Auth         │
              └────────────────────────┘
```

### 5.5 Multi-tenant y RLS

- Columna `tenant_id` en **todas** las tablas de negocio; `tenant_id` viaja en el JWT (`app_metadata.tenant_id`) y nunca lo envía el cliente.
- Hook de Auth (`custom_access_token_hook`) inyecta `tenant_id`, `plan`, `role` y `perms` al emitir el token.
- Política patrón:

```sql
create policy tenant_isolation on sales
  for all using (tenant_id = (select auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
```

- `(select ...)` para que Postgres cachee el claim (initplan) — diferencia de 10× en tablas grandes.
- Tablas de catálogo global (`tools`, `plans`, `pos_bundles`) son de lectura pública autenticada y escritura solo `service_role`.
- Regla dura: ninguna tabla de negocio sin política. Un test de CI recorre `pg_tables` y falla si encuentra una tabla sin RLS.

### 5.6 Autenticación (tres flujos)

| Flujo | Quién | Cómo |
|---|---|---|
| **Admin** | Dueño/administrador | Slug → email → `signInWithPassword` → MFA TOTP → sesión |
| **Empleado** | Cajero, supervisor | Slug + usuario + PIN → Edge Function valida (Argon2id) → JWT corto (8 h) |
| **Invitación** | Nuevo usuario | Admin invita desde `/{slug}/administracion/usuarios` → email con magic link |

Detalles:

- El slug **es público** (`posytron.com/{slug}` da 404 si no existe), así que enumerarlo no revela nada. El login siempre responde igual ante credenciales inválidas.
- Empleados sin correo: se crea un usuario sintético `{slug}.{username}@users.posytron.app`; la puerta real es el PIN.
- El JWT de empleado se emite firmado con el secreto del proyecto y se consume con `createClient({ accessToken })`. Dura el turno, no 30 días.
- Bloqueo tras 5 PIN erróneos; el admin desbloquea o rota el PIN.
- Super-admin impersona con banner permanente y registro en `audit_log`.

### 5.7 Localización LATAM

| Pieza | Diseño |
|---|---|
| Dinero | `BIGINT` en unidades menores + `CHAR(3)` de moneda. Nunca float |
| Impuestos | Reglas por línea (`rate`, `inclusive`, `name`). CO: IVA 19% incluido; MX: IVA 16% sumado |
| Identificación fiscal | `tax_id` genérico + tipo (NIT / RFC / RUC / CUIT) |
| Numeración | Prefijo por sucursal, consecutivo por tipo de documento |
| Zona horaria | Por sucursal |
| Idioma | ES/PT/EN por tenant |
| Medios de pago | Catálogo por país (efectivo, tarjeta, transferencia, Nequi, Yape, OXXO…) |
| Fiscal | Interfaz `fiscal_provider` con implementación nula hasta fase 5 |

### 5.8 Edge Functions y trabajos

| Función | Responsabilidad | Nota |
|---|---|---|
| `auth-login` | Resolver slug, verificar TOTP | Rate limit en tabla |
| `pin-login` | Validar PIN, emitir JWT de turno | Argon2id |
| `invite-user` | Crear usuario, asignar rol y plan | Valida cupo de empleados |
| `mp-checkout` | Crear preapproval | Firma del servidor |
| `mp-webhook` | Activar/renovar/suspender plan | Idempotente, sin JWT |
| `tool-execute` | Ejecutar cualquier herramienta | Valida plan, permiso y esquema |
| `ai-chat` | Orquestar LLM + tool calling | Streaming |
| `ai-voice` | Audio → texto | Whisper o proveedor del tenant |

Trabajos programados (pg_cron): insights nocturnos, dunning de pagos, recordatorio de onboarding abandonado, recálculo de métricas del hero.

Límites asumidos: Edge Functions con wall clock acotado. Todo proceso largo va a `pg_cron` + cola (`pgmq`), nunca a una request.

### 5.9 Hardware

| Dispositivo | Vía |
|---|---|
| Impresora 80mm | Red (TCP 9100) primario; WebSerial/WebUSB fallback |
| Cajón monedero | Pulso por la impresora (`ESC p`) |
| Lector de barras | HID (teclado), cero drivers |
| Móvil Android | Web Bluetooth (ESC/POS) o red |
| iOS | Solo red o PDF |

### 5.10 Resiliencia

Cada venta lleva **idempotency key** y entra a una cola en IndexedDB si falla la red: se reintenta y no se duplica. El service worker precachea shell y catálogo: la app abre y navega sin internet; solo escribir requiere conexión.

---

## 6. Arquitectura del POS (producto)

### 6.1 Mapa de rutas del sitio único

| Ruta | Pantalla | Guarda |
|---|---|---|
| `/` | Login: nombre de negocio, contraseña, TOTP | Público |
| `/registro` | Crear cuenta: slug, email, contraseña | Público |
| `/{slug}` | Resuelve estado y redirige | Autenticado |
| `/{slug}/onboarding` | Cuestionario inicial | `onboarding_pending` |
| `/{slug}/setup` | "Todo listo — Preparando tu negocio digital" | `setup_running` |
| `/{slug}/caja` | Hub Caja | `active` |
| `/{slug}/inventario` | Hub Inventario | `active` |
| `/{slug}/administracion` | Hub Administración | `active` |
| `/{slug}/red` | Hub Red Externa | `active` |
| `/{slug}/clientes` | Hub Clientes | `active` |
| `/{slug}/procesos` | Hub Procesos | `active` |
| `/{slug}/procesos/cuestionario` | Cuestionario de procesos | `active` |
| `/{slug}/herramientas` | Catálogo de las 400 | `active` |
| `/{slug}/administracion/plan` | Planes y pago | `owner` |
| `/{slug}/administracion/usuarios` | Empleados e invitaciones | `owner` |
| `/admin` | Panel super-admin SaaS | `superadmin` |

El slug es la raíz de todo: `posytron.com/minimarket-ana/caja`. Slug reservado o inexistente devuelve 404, nunca el login.

### 6.2 Máquina de estados del tenant

```
provisioned ──► onboarding_pending ──► setup_running ──► active
                      │                     │
                      └──── abandono ───────┘
                            (retoma donde iba)
```

`tenants.status` manda; un middleware de rutas redirige en cada navegación.

### 6.3 Login

| Campo | Regla |
|---|---|
| Nombre del negocio | Slug `[a-z0-9-]{3,30}`, inmutable tras el registro |
| Contraseña | Argon2id, mínimo 10 caracteres |
| Código de 6 dígitos | TOTP RFC 6238, ventana ±1 (30 s), un solo uso |

- **Credenciales inválidas → error genérico**, misma latencia siempre.
- Rate limit por slug + IP: 5 intentos / 15 min, luego espera exponencial.
- Sesión admin: access 1 h + refresh 30 días rotativo, cookie `HttpOnly`.
- Recuperación de contraseña por magic link al correo del owner.
- Slug reservado (~40): admin, api, app, login, registro, soporte, precios…

### 6.4 Cuestionario inicial

Solo la primera entrada. Cuatro pasos, autoguardado, < 3 minutos.

| Bloque | Campos | Para qué se usa |
|---|---|---|
| Tú | Nombre, apellido, rol | Saludo del hero, permisos |
| Tu negocio | Nombre comercial, tipo, tamaño, # empleados | **Glifo**, preset de herramientas, POS sugerido |
| Ubicación | País, ciudad, dirección, zona horaria | Moneda, impuestos, numeración, tirilla |
| Operación | Horario, medios de pago, ¿inventario?, ¿crédito?, ¿delivery? | Hubs activos, pagos por defecto, alertas |

Al terminar se genera `business_profile` (JSONB versionado) y el tenant pasa a `setup_running`.

### 6.5 Pantalla de preparación

"Todo listo — Preparando tu negocio digital". Pasos **reales**, no animación:

1. Crear sucursal y caja principal. 2. Aplicar impuestos y moneda. 3. Crear lista de precios y medios de pago. 4. Sembrar categorías base. 5. Generar el glifo. 6. Activar hubs y primeras 12 herramientas.

Objetivo < 8 s. Si un paso falla: reintento visible, nunca se avanza a medias.

### 6.6 Hero y toolbar

**Toolbar izquierda:** riel de 72 px con 6 iconos + avatar; se expande a 240 px. En móvil, barra inferior.

**Hero:** glifo + nombre + exactamente **6 tarjetas**, ni una más.

| # | Indicador | Métrica viva | Redirige a |
|---|---|---|---|
| 1 | Caja | Ventas de hoy / turno abierto | `/{slug}/caja` |
| 2 | Inventario | Productos bajo mínimo | `/{slug}/inventario` |
| 3 | Administración | Plan, usuarios, alertas | `/{slug}/administracion` |
| 4 | Red Externa | Por pagar a proveedores | `/{slug}/red` |
| 5 | Clientes | Cuentas por cobrar | `/{slug}/clientes` |
| 6 | Procesos | POS activos / recomendados | `/{slug}/procesos` |

Si un hub no aplica, la tarjeta se muestra **inactiva con candado y motivo** ("no manejas inventario"). Nunca se elimina: siempre son 6.

### 6.7 Glifo geométrico

**10 arquetipos base:**

| # | `archetype` | Para |
|---|---|---|
| 1 | `kiosk_single` | Tienda de barrio, quiosco |
| 2 | `retail_grid` | Minimarket, superete |
| 3 | `supermarket_aisles` | Supermercado, autoservicio |
| 4 | `restaurant_tables` | Restaurante, comida corrida |
| 5 | `cafe_bar_counter` | Cafetería, bar |
| 6 | `bakery_racks` | Panadería, pastelería |
| 7 | `pharmacy_shelves` | Farmacia, droguería |
| 8 | `services_rooms` | Barbería, spa, consultorio |
| 9 | `workshop_bays` | Taller mecánico, motos |
| 10 | `warehouse_bulk` | Distribuidora, ferretería |

**Combinaciones:** 10 arquetipos × 3 densidades × 4 paletas = **120**, muy por encima del mínimo de 30.

| Token | Origen | Efecto |
|---|---|---|
| `archetype` | tipo de negocio | Forma base del plano |
| `density` | # empleados y tamaño | Cantidad y espaciado de elementos |
| `palette` | sector | 4 paletas, contraste AA |
| `accent` | rasgos del cuestionario | Delivery, crédito, multi-sucursal |
| `seed` | `hash(tenant_id)` | Variación determinista |

Criterios obligatorios: SVG plano de 2–3 colores, viewBox 800×400, < 8 KB, sin texto, máximo 40 primitivas, legible a 320 px, `role="img"` con `aria-label`. Se lee como un plano, no como un dibujo.

### 6.8 Los 6 hubs

| Hub | Contiene | Módulos que absorbe |
|---|---|---|
| **Caja** | Venta, turnos, arqueo, movimientos, devoluciones | Ventas, caja, devoluciones, descuentos |
| **Inventario** | Catálogo, stock, kardex, ajustes, mínimos, códigos | Catálogo, inventario, ajustes |
| **Administración** | Empresa, sucursales, usuarios, plan, impuestos, gastos, reportes | Gastos, reportes, configuración, SaaS |
| **Red Externa** | Proveedores, órdenes de compra, recepción, integraciones, asesores | Compras, integraciones |
| **Clientes** | CRM, historial, fiado, cupos, abonos, fidelización | Clientes + fiado |
| **Procesos** | POS activos, cuestionario, automatizaciones, catálogo de 400 herramientas | Motor de recomendación |

Patrón único por hub: cabecera con 3 métricas, barra de acciones, tabla o tablero, buscador. Nunca más de 2 niveles de menú.

### 6.9 Procesos y motor de recomendación

Primera entrada a Procesos ⇒ cuestionario de procesos. Captura **qué hace el administrador**, no qué software quiere.

- Catálogo de ~40 tareas en 6 etapas: comprar, recibir/almacenar, producir, vender, cobrar, cerrar.
- Matriz `pos_capabilities`: ~25 capacidades × ~8 POS candidatos.
- Scoring ponderado + reglas duras ("atiendo mesas" ⇒ restaurante en el top 3).
- Salida: top 3 con % y explicación legible; botón para activar. Varios POS pueden convivir.
- Reejecutable cuando el negocio cambie. Explicabilidad obligatoria: nunca caja negra.

### 6.10 Interacción

"Todo debe ser muy interactivo" traducido a decisiones concretas:

| Patrón | Dónde |
|---|---|
| Command palette (`Ctrl/⌘+K`) | Todo el sitio: "nueva venta", "precio de X", "cerrar caja" |
| Botón de voz persistente | Esquina inferior derecha, en todos los hubs |
| Edición en línea | Tablas y tarjetas: clic para editar, sin modales |
| Teclado primero | Cajero: F2 buscar, F4 cobrar, F8 imprimir |
| Optimistic UI | Toda escritura se refleja antes de confirmar |
| Atajos contextuales | Cada hub expone los suyos en `?` |
| Tour de 60 s | Solo la primera visita a cada hub |
| Estados vacíos accionables | Nunca "no hay datos": siempre un botón que resuelve |

### 6.11 Casos límite

| Caso | Comportamiento |
|---|---|
| Negocio inexistente | 404 en la URL; login con error genérico |
| TOTP expirado | Error en el campo del código, sin revelar cuál falló |
| Onboarding abandonado | Se retoma en el paso donde quedó |
| Setup con un paso fallido | Reintento visible, no se avanza a medias |
| Sesión expirada durante una venta | Venta en IndexedDB, se reenvía tras re-login |
| Cupo de empleados alcanzado | Se bloquea la invitación y se ofrece upgrade |
| Plan vencido | Solo lectura; la venta se bloquea con aviso claro |
| Super-admin en un tenant | Banner permanente + `audit_log` |

---

## 7. IA: el gemelo digital

### 7.1 Concepto

El gemelo digital tiene dos mitades:

- **Modelo de lectura**: vistas materializadas del negocio (`business_state`): stock real, caja abierta, cartera, por pagar, ventas del día, personal activo, márgenes.
- **Modelo de acción**: las 400 herramientas expuestas como *tool calls*. La IA no escribe SQL; **ejecuta herramientas** con validación de esquema, permiso y plan.

Así la IA "entiende todo el POS" sin poder romperlo: lee vistas y actúa solo por herramientas auditadas.

### 7.2 BYOK — API key del usuario

| Aspecto | Decisión |
|---|---|
| Dónde se guarda | Supabase **Vault** (`vault.secrets`), cifrada con pgsodium |
| Alcance | Por tenant; override opcional por usuario |
| Quién la ve | Solo `service_role` dentro de Edge Functions. **Nunca** vuelve al cliente |
| Verificación | Al guardar se hace un ping real al proveedor y se guarda `last_ok_at` |
| Rotación | El owner la reemplaza; se guarda historial de huellas (no de claves) |
| UI | Administración → IA → "Usar mi API key" con selector de proveedor |

Proveedores soportados: Google Gemini (por defecto), OpenAI, Anthropic, Groq, OpenRouter, DeepSeek y cualquier endpoint compatible con OpenAI (Ollama incluido).

**Regla de negocio:** con BYOK el cliente paga su consumo; Posytron solo cobra el plan. Sin BYOK, consume la cuota de Premium.

### 7.3 Cómo la IA elige herramientas

No se envían 400 herramientas al modelo: el contexto se degrada y la precisión cae.

```
voz/texto → embedding (pgvector) → top 25 herramientas afines
          → filtro por plan, permiso y POS activo
          → LLM con 15–25 tool schemas
          → tool call validado (JSON Schema + RLS + plan)
          → resultado → narración corta
```

- Cada herramienta tiene `embedding vector(1536)` y metadatos (`category`, `verticals`, `capabilities`, `impact`).
- Si la intención es ambigua, la IA pregunta una sola cosa y no asume.
- Tope de 6 tool calls por turno; luego pide confirmación.

### 7.4 Voz

| Pieza | Implementación |
|---|---|
| Captura | Push-to-talk (botón o barra espaciadora), nunca escucha permanente |
| STT primario | Web Speech API (Chrome/Android, gratis, en dispositivo) |
| STT fallback | MediaRecorder → Edge Function `ai-voice` → Whisper (BYOK o cuota) |
| TTS | `SpeechSynthesis`, voz local |
| Confirmación | Toda acción destructiva se lee en voz alta antes de ejecutar |

Frases objetivo del MVP:

- "¿Cuánto vendí hoy?" → consulta.
- "Cámbiame el precio de la goma a 1.200" → acción con confirmación.
- "Agrega 24 panes al inventario" → movimiento de stock.
- "Ciérrame la caja" → arqueo guiado.
- "¿Qué se me va a acabar esta semana?" → insight.

### 7.5 Permisos y confirmaciones

| Tipo de acción | Confirmación |
|---|---|
| Lectura | Ninguna |
| Escritura menor (precio, stock, cliente) | Confirmación por voz o clic, con diff visible |
| Dinero (descuento, devolución, gasto) | Confirmación explícita + umbral configurable |
| Destructiva (borrar, anular venta) | Solo owner, doble confirmación |
| Masiva (>20 registros) | Vista previa obligatoria antes de aplicar |

Toda acción de la IA entra a `ai_actions` con `before`, `after`, `tool_key`, `actor` y `undoable`. **Deshacer** durante 24 h.

### 7.6 Costos y cuotas

| Modo | Quién paga | Límite |
|---|---|---|
| Premium incluido | Posytron | Fair use: 150/día por tenant, 20/hora por usuario |
| BYOK | El cliente | Sin límite de Posytron |
| Pro sin add-on | — | IA deshabilitada, herramientas manuales |

Controles: cache por hash de intención + tenant, modelo pequeño para routing y modelo grande solo para narración, tope de tokens por respuesta, alerta al 80% de cuota.

### 7.7 Lo que la IA no hace

- No escribe SQL libre ni toca tablas directo.
- No ve datos de otro tenant (§5.5 lo impide a nivel de base).
- No ejecuta acciones sin permiso del rol, aunque el usuario lo pida por voz.
- No inventa cifras: si la métrica no existe, dice "no lo tengo".

---

## 8. Catálogo de 400 herramientas

### 8.1 Anatomía de una herramienta

```jsonc
{
  "key": "inventory.bulk_price_update",
  "name": "Actualizar precios en masa",
  "description": "Sube o baja el precio de una categoría por porcentaje.",
  "category": "inventario",
  "kind": "action",              // query | action | automation | calculator | integration | playbook | report
  "verticals": ["retail", "farmacia"],
  "capabilities": ["price_list", "bulk_edit"],
  "impact": 4,                    // 1–5, para ordenar el catálogo
  "input_schema": { "$ref": "#/defs/BulkPriceUpdate" },
  "handler": { "type": "rpc", "name": "tool_bulk_price_update" },
  "min_plan": "pro",
  "permission": "inventory.write",
  "ai_enabled": true,
  "status": "ready"               // ready | beta | planned
}
```

Tipos y costo de construcción:

| `kind` | Qué es | Costo |
|---|---|---|
| `query` / `report` | Vista o RPC de lectura + UI de tabla | Bajo |
| `calculator` | Función pura (margen, punto de equilibrio, lote óptimo) | Bajo |
| `action` | RPC transaccional con validación | Medio |
| `automation` | Regla con trigger o cron | Medio |
| `playbook` | Guía paso a paso con checklist persistente | Bajo |
| `integration` | Conector externo (WhatsApp, DIAN, pasarelas) | Alto |

### 8.2 Taxonomía (400)

| Categoría | # | Ejemplos |
|---|---|---|
| Caja y ventas | 45 | Cierre ciego, arqueo por denominación, venta rápida por teclado |
| Inventario | 45 | Actualización masiva de precios, conteo cíclico, transferencia entre sucursales |
| Compras y proveedores | 40 | Comparador de proveedores, orden sugerida por rotación, recepción parcial |
| Clientes y fidelización | 40 | Segmentación RFM, cupón de cumpleaños, cobranza escalonada |
| Finanzas y gastos | 35 | Punto de equilibrio, flujo de caja proyectado, margen por categoría |
| Precios y promociones | 30 | Elasticidad simple, combo automático, precio por volumen |
| Reportes y análisis | 40 | Ventas por hora, producto estrella, canibalización |
| Automatizaciones | 30 | Reposición automática, alerta de margen negativo, cierre programado |
| Marketing y comunicación | 25 | Plantilla de WhatsApp, campaña a clientes inactivos, QR de reseña |
| Equipo y operación | 25 | Turnos, comisiones, checklist de apertura |
| Integraciones | 25 | WhatsApp, Google Sheets, pasarelas, facturación |
| Administración y cumplimiento | 20 | Respaldos, exportación fiscal, auditoría de cambios |
| **Total** | **400** | |

### 8.3 Filtrado por cuestionarios

- **Todas** las herramientas existen en `/{slug}/herramientas` y son buscables.
- El cuestionario inicial y el de Procesos escriben en `tenant_tools`: `pinned`, `order`, `hidden_noise`.
- El hero, la command palette y la IA leen primero las fijadas.
- Nada se elimina: lo no relevante baja de prioridad, no desaparece. Cumple "todas disponibles".
- Las herramientas de IA (`ai_enabled`) requieren plan con IA, pero siguen visibles con candado y motivo.

### 8.4 Cómo se llega a 400 sin morir

| Fase | Herramientas | Enfoque |
|---|---|---|
| 2 | 40 | Caja + inventario, las de uso diario |
| 3 | 120 | Compras, clientes, finanzas, reportes |
| 4 | 220 | Automatizaciones, marketing, equipo |
| 5 | 320 | Integraciones y verticales |
| 6 | 400 | Largo tail y nichos |

Regla de escalado: **cada herramienta es un manifiesto + una RPC**. Las de tipo `query`, `report`, `calculator` y `playbook` son declarativas y comparten un renderer único; solo `action`, `automation` e `integration` requieren código propio.

### 8.5 UI del catálogo

- Buscador con filtros: categoría, tipo, vertical, impacto, plan.
- Tarjeta con impacto (1–5), qué resuelve en una línea y botón "Usar".
- "Recomendadas para tu negocio" arriba, alimentado por los cuestionarios.
- Cada herramienta abierta muestra su esquema de entrada como formulario generado — no hay 400 pantallas distintas.

---

## 9. Modelo de datos

| Tabla | Propósito |
|---|---|
| `tenants` | Negocio. País, moneda, idioma, `status`, `plan` |
| `business_profiles` | Cuestionario inicial (JSONB versionado) |
| `demo_datasets` | Negocio de ejemplo para cuentas Free (solo lectura) |
| `process_profiles` | Cuestionario de procesos (JSONB versionado) |
| `users` / `memberships` | Usuarios, rol y PIN dentro del tenant |
| `branches` / `registers` / `shifts` | Sucursales, cajas, turnos y arqueo |
| `products` / `variants` / `barcodes` | Catálogo |
| `categories` / `price_lists` | Organización y precios |
| `inventory_levels` / `stock_moves` | Cache de stock y kardex append-only |
| `suppliers` / `purchases` / `purchase_lines` | Compras |
| `customers` / `credit_accounts` / `credit_payments` | Fiado |
| `sales` / `sale_lines` / `payments` | Venta con snapshot inmutable |
| `promotions` / `returns` / `expenses` | Descuentos, devoluciones, gastos |
| `cash_movements` | Entradas y salidas de efectivo |
| `tools` | Catálogo de 400 con `embedding` |
| `tenant_tools` | Prioridad, fijado y estado por tenant |
| `ai_providers` / `ai_keys` | BYOK (referencia a Vault) |
| `ai_threads` / `ai_messages` / `ai_actions` | Conversaciones, ejecuciones y undo |
| `plans` / `plan_limits` / `subscriptions` / `invoices` | SaaS |
| `invites` | Invitaciones pendientes |
| `audit_log` | Quién hizo qué |

Reglas: IDs `UUIDv7`; timestamps UTC; snapshot en `sale_lines`; `stock_moves` append-only; toda tabla con `tenant_id` lleva RLS.

---

## 10. Roadmap

Semana 1 = lunes 9 de noviembre de 2026. Un dev full-time.

### Fase 0 — Fundación (semanas 1–2)

| Entregable | Criterio de salida |
|---|---|
| Proyecto Supabase + CLI + migraciones | `supabase db reset` levanta todo desde cero |
| Esquema base: tenants, users, memberships, branches | Migración limpia + seed |
| RLS + `custom_access_token_hook` | Test: tenant A no ve datos de B. CI falla si una tabla no tiene RLS |
| Auth admin: slug → email → password → TOTP | Login, refresh y logout con tests |
| Shell del sitio único + PWA | `npm run build` produce **un** artefacto instalable |
| Design system mínimo | Página de muestra usable |

### Fase 1 — Entrada (semanas 3–6)

| Entregable | Criterio de salida |
|---|---|
| Login de 3 campos + empleado con PIN | Ambos flujos funcionando con rate limit |
| Registro + plan Free + asignación de plan | Un registro nuevo queda en Free |
| Cuestionario inicial (4 pasos, autosave) | Abandonar y retomar funciona |
| Setup con pasos reales | < 8 s, reintento ante fallo |
| Glifo (10 arquetipos × 3 × 4) | 120 combinaciones deterministas |
| Hero + toolbar con 6 tarjetas | Exactamente 6, con métricas reales |
| Shell de los 6 hubs | Navegación completa, usable a 375 px |

### Fase 2 — Núcleo de venta (semanas 7–12)

| Entregable | Criterio de salida |
|---|---|
| Catálogo + variantes + códigos de barras | Importar 500 productos en < 30 s |
| Kardex y stock por sucursal | Venta y compra mueven stock correcto |
| Pantalla de venta | Escanear → cobrar → imprimir en < 5 s |
| Multi-pago | Venta con 2 medios cuadra con el total |
| Caja y turnos | Apertura → ventas → arqueo con diferencia |
| Impresión 80mm + cajón | Tirilla real en impresora de red |
| PWA en móvil | Instalar, vender y escanear con cámara |
| **Registro de herramientas + 40 herramientas** | `/{slug}/herramientas` operable y buscable |

### Fase 3 — Negocio completo + cobro (semanas 13–17) → **MVP vendible**

| Entregable | Criterio de salida |
|---|---|
| Compras con costo promedio | Margen correcto tras 2 compras a distinto costo |
| Fiado con cupo y abonos | Cliente bloqueado al exceder cupo |
| Descuentos, devoluciones, gastos, reportes | 6 reportes exportables |
| **120 herramientas** | Catálogo con filtros y formularios generados |
| MercadoPago: checkout + webhook + email | Pago real que activa Pro o Premium |
| Invitaciones y cupos de empleados | Pro 3 / Premium 10, bloqueo al exceder |
| Panel super-admin | Ver tenants, MRR, suspender, impersonar |
| Landing + precios | Página pública con checkout |

### Fase 4 — IA y gemelo digital (semanas 18–22) → **LANZAMIENTO PREMIUM**

| Entregable | Criterio de salida |
|---|---|
| BYOK con Vault y verificación real | Guardar key, usarla, rotarla; nunca vuelve al cliente |
| `ai-chat` con tool calling sobre 220 herramientas | 10 frases objetivo resueltas correctamente |
| Voz push-to-talk + Whisper fallback | Dictar y ejecutar una venta de prueba |
| Confirmaciones, umbrales y undo | Toda acción reversible por 24 h |
| Cuotas y cache de IA | Fair use activo: 150/día, 20/hora, aviso antes del corte |
| **220 herramientas** | Automatizaciones y marketing activos |

### Fase 5 — Profundidad (semanas 23–30)

- 320 herramientas; integraciones (WhatsApp, Sheets, pasarelas).
- Fiscal Colombia (DIAN) con proveedor autorizado.
- Insights proactivos y alertas push.
- Restaurante en beta cerrada (mesas, comandas).
- Impresión Bluetooth Android y offline robusto.

### Fase 6 — "Todo en uno" (mes 8 en adelante)

- 400 herramientas.
- Verticales farmacia y servicios.
- Marketplace de asesores humanos con IA de apoyo.
- Agregador de POS de terceros.
- White-label.

---

## 11. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Scope creep (el enemigo #1) | Mata el proyecto | Cada fase se lanza; lo nuevo entra a la siguiente |
| 400 herramientas se vuelven 400 pantallas | Producto inmanejable | Manifiesto + RPC + formulario generado; solo 3 tipos requieren UI propia |
| Enviar 400 tools al LLM | Costo y precisión destruidos | Retrieval por embedding, top 25, tope de 6 calls por turno |
| Costo de IA sin control | Margen negativo | BYOK, cuotas, cache, modelo pequeño para routing |
| RLS mal escrita en una tabla nueva | Fuga entre tenants | Test de CI que falla si una tabla no tiene política |
| Límites de Edge Functions (tiempo/CPU) | Timeouts en producción | Procesos largos a `pg_cron` + `pgmq`, nunca en request |
| Voz en iOS o en locales ruidosos | IA inutilizable en campo | Fallback a texto siempre visible; push-to-talk, no manos libres |
| LATAM fiscal (cada país es un proyecto) | Retraso de meses | `fiscal_provider` aislado; solo Colombia en fase 5 |
| Impresión: drivers y modelos | Soporte eterno | Red TCP 9100 primario; lista de impresoras certificadas |
| El glifo se vuelve proyecto de arte | Semanas perdidas | Paramétrico, 10 arquetipos, sin ilustración |
| Competencia con Siigo/Alegra/Tienda POS | Baja conversión | No pelear contabilidad; pelear velocidad + IA + precio |

---

## 12. KPIs

| Métrica | Meta fase 4 |
|---|---|
| Time-to-first-sale | < 60 min |
| Onboarding completado | > 80% de registros |
| Free → Pro | > 12% en 90 días |
| Pro → Premium | > 25% |
| Tenants de pago | 20 en 90 días |
| MRR | USD 700 a los 90 días |
| Churn mensual | < 5% |
| Ventas sin error | > 99.5% |
| Frases de voz resueltas | > 85% |
| Herramientas usadas por tenant/mes | > 12 |
| Costo IA por tenant de pago | < USD 3/mes |

---

## 13. Semana 1 — checklist ejecutable

1. Conectar el proyecto Supabase existente (`supabase link`) + `supabase start` local; migraciones versionadas.
2. Esquema base: `tenants`, `users`, `memberships`, `branches`, `audit_log`.
3. RLS en todas + `custom_access_token_hook`.
4. **Test de aislamiento** entre tenants en CI.
5. Auth: registro con slug, login email/password, MFA TOTP.
6. `apps/web`: Vite + TS + Tailwind + router con §6.1 + login funcional.
7. Shell PWA: manifest, service worker, iconos.
8. `packages/core` con tipos de dinero, impuestos y tenant.
9. CI: tsc + vitest + `supabase db lint` + migraciones en verde.

---

## 14. ADRs iniciales

| ADR | Decisión | Motivo |
|---|---|---|
| 0001 | Supabase como backend completo | Auth, RLS y Postgres listos; cero servidores que mantener |
| 0002 | RLS, no schema-per-tenant | Migraciones únicas, aislamiento a nivel de motor |
| 0003 | Dinero en enteros menores | Evita errores de redondeo en impuestos |
| 0004 | IA sobre herramientas, no texto-a-SQL | Evita fugas y alucinaciones; auditoría y undo posibles |
| 0005 | Retrieval de herramientas con pgvector | 400 tools no caben en un prompt |
| 0006 | PWA única, sin app nativa | Un código, un deploy, cero tiendas |
| 0007 | Snapshot en líneas de venta | Histórico inmutable |
| 0008 | Un solo build web, admin incluido | Un dominio, sin drift de versiones |
| 0009 | Glifo paramétrico en SVG | Personalización a costo cero |
| 0010 | Login con slug, no email | El usuario recuerda su negocio |
| 0011 | TOTP en app autenticadora | Sin costo por mensaje, funciona sin internet |
| 0012 | BYOK en Vault | El cliente paga su IA; la clave nunca sale del servidor |
| 0013 | JWT de turno para empleados | PIN sin email y sin sesiones de 30 días |
| 0014 | Herramientas como manifiesto + RPC | Escalar a 400 sin 400 pantallas |
| 0015 | Planes con cuotas en base de datos | El cupo no se puede burlar desde el cliente |
