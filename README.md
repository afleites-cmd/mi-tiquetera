# Mi Tiquetera — Mantenimiento, presupuestos y tesorería

Sistema de tickets de mantenimiento con flujo de presupuestos por rubro
(mano de obra / materiales), facturación (inmediato, cuenta corriente, semanal,
30 y 60 días) y panel de Tesorería con vencimientos.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Prisma 6 · PostgreSQL · Auth.js.

## Flujo

```
NUEVO → EN_PRESUPUESTACION → PENDIENTE_APROBACION → AUTORIZADO → PENDIENTE_PAGO → FINALIZADO
                 ↑                    │
                 └──── RECHAZADO ◄────┘
```

| Rol | Hace |
|---|---|
| **Solicitante** | Crea tickets con semáforo de urgencia (🟢 Normal · 🟡 Urgente · 🔴 Emergencia). Ve sólo los suyos. |
| **Mantenimiento** | Carga presupuestos (cada uno tilda si cubre *mano de obra*, *materiales* o ambos), envía a aprobación, carga facturas. |
| **Gerente** | Aprueba o rechaza cada presupuesto. El ticket se autoriza cuando los aprobados cubren ambos rubros. |
| **Tesorería** | Ve facturas agrupadas (vencen en 5 días / cuenta corriente / próximas / pagadas), registra pagos con comprobante. |

Cada presupuesto aprobado tiene su factura. El ticket pasa a *Pendiente de pago*
cuando todas están cargadas, y a *Finalizado* cuando todas están pagas.
Toda transición queda en el historial del ticket.

## Correr en tu computadora

Requisitos: [Node.js](https://nodejs.org) 20 o superior y una base PostgreSQL
(gratis en [Neon](https://neon.tech) o [Supabase](https://supabase.com)).

```bash
npm install
cp .env.example .env        # editar DATABASE_URL y AUTH_SECRET
npx prisma migrate deploy   # crea las tablas
npm run db:seed             # sedes + usuarios de prueba
npm run dev                 # http://localhost:3000
```

Usuarios de prueba (contraseña `1234`):

| Rol | Email |
|---|---|
| Solicitante | solicitante@demo.com |
| Mantenimiento | mantenimiento@demo.com |
| Gerente | gerente@demo.com |
| Tesorería | tesoreria@demo.com |

> Cambiá esas contraseñas antes de usarlo con datos reales (editá `prisma/seed.ts`
> o creá usuarios nuevos desde Prisma Studio: `npm run db:studio`).

## Publicar en Vercel

1. Creá la base en Neon o Supabase y copiá la *connection string*.
2. En [vercel.com](https://vercel.com) → **Add New Project** → importá este repositorio.
3. En **Environment Variables** agregá:
   - `DATABASE_URL` → la connection string
   - `AUTH_SECRET` → una clave larga al azar (`openssl rand -base64 32`)
   - `AUTH_TRUST_HOST` → `true`
4. **Deploy**. El build ejecuta `prisma generate` automáticamente.
5. Una sola vez, desde tu computadora con el mismo `DATABASE_URL` en `.env`:
   ```bash
   npx prisma migrate deploy && npm run db:seed
   ```

### Archivos adjuntos

Por defecto se guardan en `public/uploads/` (sirve para desarrollo). En Vercel el
disco es efímero: para producción reemplazá el cuerpo de
`src/app/api/upload/route.ts` por Supabase Storage o Vercel Blob manteniendo la
respuesta `{ url }`. Nada más cambia.

## Estructura

```
prisma/
  schema.prisma            modelo de datos
  migrations/              migraciones SQL
  seed.ts                  datos iniciales
src/
  auth.ts, auth.config.ts  login (Auth.js)
  middleware.ts            protección de rutas
  lib/
    workflow.ts            máquina de estados, cobertura de presupuestos, vencimientos, semáforo
    tickets.ts             moveTicket() con historial, errores HTTP
    prisma.ts, auth.ts, format.ts, upload-client.ts
  app/
    login/
    (app)/tickets/         lista · nuevo · detalle
    (app)/dashboard/tesoreria/
    api/
      tickets/             POST alta · transition · [id]/quotes · [id]/priority
      quotes/[id]/         review (Gerente) · invoice (Mantenimiento)
      invoices/[id]/payment  (Tesorería)
      upload/
  components/
    tickets/ presupuestos/ facturas/ tesoreria/ layout/
```
