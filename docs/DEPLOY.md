# Despliegue de Posytron

Dos piezas: la app web (Vercel) y el backend (Supabase). El repo ya tiene todo el código; falta conectar tus credenciales.

## 0. Requisitos

- Node 20+ y npm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli): `npm i -g supabase`
- Cuenta de Supabase con un proyecto creado (región `us-east-1` o la más cercana)
- Cuenta de MercadoPago con aplicación de tipo *Suscripciones*
- (Opcional) Cuenta de Google AI Studio para la clave de Gemini incluida

## 1. Backend

```bash
cd Posytron
supabase login                      # abre el navegador
supabase link --project-ref <REF>   # REF está en Project Settings → General
supabase db push                    # aplica migrations 0001..0006
```

Luego carga el catálogo de 400 herramientas:

```bash
psql "$DATABASE_URL" -f supabase/seed/tools.sql
# o desde el dashboard: SQL Editor → pegar supabase/seed/tools.sql
```

### Hook de JWT (obligatorio)

Dashboard → **Authentication → Hooks → Custom Access Token** → selecciona
`public.custom_access_token_hook`. Sin esto, `tenant_id` no viaja en el token y RLS
no deja ver nada.

### Variables de entorno de las funciones

```bash
supabase secrets set \
  SUPABASE_URL=https://<REF>.supabase.co \
  SUPABASE_ANON_KEY=<anon> \
  SUPABASE_SERVICE_ROLE_KEY=<service_role> \
  GOOGLE_AI_API_KEY=<gemini> \
  MERCADOPAGO_ACCESS_TOKEN=<token> \
  MERCADOPAGO_WEBHOOK_SECRET=<clave del webhook>
```

### Funciones

```bash
supabase functions deploy register-tenant
supabase functions deploy employee-login
supabase functions deploy mercadopago-webhook --no-verify-jwt
supabase functions deploy ai-chat
```

Webhook de MercadoPago: apunta a
`https://<REF>.supabase.co/functions/v1/mercadopago-webhook`
con los eventos `subscription_preapproval` y `payment`.

## 2. Frontend

```bash
npm install
npm run build          # tsc + vite build
npm run dev            # http://localhost:5173
```

En Vercel: importa el repo, root `apps/web`, build `npm run build`, output `dist`.
Como el router es de cliente, agrega un rewrite `/(.*) → /index.html`.

## 3. Modo local sin backend

La v0.1 corre completa con `localStorage` usando el mismo modelo de dominio.
No necesita Supabase ni red. Credenciales del demo:

| Campo | Valor |
| --- | --- |
| Negocio | `minimarket-ana` |
| Contraseña | `posytron2026` |
| Código TOTP | cualquier 6 dígitos |
| Empleado | `maria` / PIN `1234` |

Para empezar de cero: Administración → o `localStorage.removeItem("posytron.db.v1")`.

## 4. Checklist de producción

- [ ] Hook de access token activo y probado (`select public.jwt_claim('tenant_id')`)
- [ ] `tools.sql` cargado: `select count(*) from public.tools;` → 400
- [ ] RLS verificado con dos tenants distintos
- [ ] Webhook de MercadoPago firmando (probar con `payment.created`)
- [ ] Clave de Gemini en Vault o como secreto de plataforma
- [ ] CORS de las funciones limitado a `posytron.com`
- [ ] Backups diarios activos en Supabase
- [ ] Dominio `posytron.com` con rewrite SPA y `manifest.webmanifest` servido
