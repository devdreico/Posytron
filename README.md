# Posytron

POS SaaS multi-país (LATAM) y multi-vertical. El comerciante compra su cuenta dentro del software y opera todo su negocio —sucursales, cajas y verticales— desde un solo sitio web instalable.

**Diferenciador:** gemelo digital. La IA entiende todo el POS y lo modifica por voz.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdevdreico%2FPosytron&root-directory=apps%2Fweb&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY&envDescription=Opcional%3A%20conectar%20Supabase.%20Sin%20estas%20variables%20la%20app%20corre%20en%20modo%20local.)

## Documentación

- [Plan de implementación](docs/PLAN-IMPLEMENTACION.md)
- [Despliegue paso a paso](docs/DEPLOY.md)

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind (PWA, un solo build)
- **Backend:** Supabase (Postgres + Auth + RLS + Edge Functions + Storage + Realtime + pgvector + Vault)
- **Pagos:** MercadoPago (preapproval)
- **IA:** multi-proveedor con BYOK cifrado en Vault

## Estado actual — v0.1

Funciona de punta a punta en el navegador con `localStorage` y el mismo modelo de dominio que Postgres:

- Login de administrador (negocio + contraseña + TOTP) y de empleado (usuario + PIN)
- Registro, onboarding de 4 pasos y setup animado ("Todo listo — Preparando tu negocio digital")
- Hero con glifo paramétrico del negocio y los 6 hubs: Caja, Inventario, Administración, Red externa, Clientes, Procesos
- Caja: turnos, venta rápida, cobro mixto, tirilla, arqueo y cierre
- Inventario: alta/edición, importación y exportación CSV, ajustes auditados
- Red externa: proveedores, órdenes de compra y recepción con costo promedio
- Clientes: cupo, cartera y abonos
- Procesos: cuestionario que puntúa y activa los POS recomendados
- Catálogo de **400 herramientas** ejecutables (consulta, reporte, cálculo, acción, automatización, guía, integración)
- Copiloto con motor local y Gemini BYOK (voz incluida donde el navegador lo soporta)
- Planes Free / Pro / Premium con límites reales y trial de 14 días

## Arrancar

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # tsc --noEmit && vite build
```

Demo: negocio `minimarket-ana`, contraseña `posytron2026`, TOTP `123456`.
Empleado: `maria` / PIN `1234`.

## Estructura

```
apps/web/            app web (PWA)
  src/lib/           dominio: tipos, store, seed, glifo, IA, runner de herramientas
  src/pages/         vistas por hub
  src/components/    shell, UI, copiloto
scripts/build-tools.mjs    generador del catálogo (400 exactas)
supabase/migrations/       esquema, RLS, hooks, facturación, Vault
supabase/functions/        register-tenant, employee-login, mercadopago-webhook, ai-chat
supabase/seed/tools.sql    catálogo listo para cargar
```
