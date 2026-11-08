# Posytron

POS SaaS multi-país (LATAM) y multi-vertical. El comerciante compra su cuenta dentro del software y opera todo su negocio —sucursales, cajas y verticales— desde un solo sitio web instalable.

**Diferenciador:** gemelo digital. La IA entiende todo el POS y lo modifica por voz.

## Documentación

- [Plan de implementación v1](docs/PLAN-IMPLEMENTACION.md)

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind (PWA, un solo build)
- **Backend:** Supabase (Postgres + Auth + RLS + Edge Functions + Storage + Realtime + pgvector + Vault)
- **Pagos:** MercadoPago (preapproval)
- **IA:** multi-proveedor con BYOK cifrado en Vault

## Producto

- Login por nombre de negocio + contraseña + TOTP
- Onboarding en dos cuestionarios (inicial y de procesos)
- Hero con glifo geométrico y exactamente 6 hubs
- 400 herramientas catalogadas, filtradas por cuestionario
- Planes Free / Pro / Premium

## Estado

Fase 0 — fundación. Sin código de aplicación todavía.
