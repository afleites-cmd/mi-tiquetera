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

Los **permisos son por usuario** (tildes en el menú Usuarios). El rol sólo fija los
tildes iniciales; el Gerente los tiene todos y puede ajustarlos para cualquiera.

| Rol | Permisos iniciales |
|---|---|
| **Solicitante** | Crear tickets (con semáforo 🟢 Normal · 🟡 Urgente · 🔴 Emergencia). Ve sólo los suyos. |
| **Mantenimiento** | Crear tickets, cargar presupuestos (tilda *mano de obra*, *materiales* o ambos), cargar facturas, cambiar urgencia, ver todos los tickets. |
| **Tesorería** | Crear tickets, ver Tesorería (vencen en 5 días / cuenta corriente / próximas / pagadas), registrar pagos, ver todos los tickets. |
| **Gerente** | Todo: además aprueba o rechaza presupuestos y administra usuarios. |

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

> Cambiá esas contraseñas antes de usarlo con datos reales: cada usuario puede
> hacerlo desde **Mi cuenta** (clic en su nombre, arriba a la derecha).

## Cuentas de usuario

No hay registro público: el **Gerente** administra los usuarios desde el menú
**Usuarios**.

- **Crear usuario**: nombre, email y rol. El sistema genera una contraseña
  provisoria (ej. `KRTM-4821`) que se muestra una sola vez para pasársela a la
  persona. Al ingresar, se le exige elegir una contraseña propia antes de seguir.
- **Olvidó la contraseña**: el Gerente toca **Nueva contraseña** en la fila del
  usuario y le pasa la provisoria nueva. La anterior deja de funcionar.
- **Permisos**: botón "Permisos" en la fila → tildes individuales. "Restablecer" vuelve
  a los del rol. Cambiar el rol también restablece los tildes.
- **Editar el nombre** (clic sobre el nombre en la lista), **cambiar rol** o **desactivar** un acceso (el usuario inactivo no puede
  entrar pero conserva su historial).
- Cualquier usuario cambia su propia contraseña desde **Mi cuenta**.

Esto evita depender del envío de emails. Si más adelante querés "Olvidé mi
contraseña" por email, se agrega con un proveedor como Resend.

## Publicar en Vercel

1. Creá la base en Neon o Supabase y copiá la *connection string*.
2. En [vercel.com](https://vercel.com) → **Add New Project** → importá este repositorio.
3. En **Environment Variables** agregá:
   - `DATABASE_URL` → la connection string
   - `AUTH_SECRET` → una clave larga al azar (`openssl rand -base64 32`)
4. **Deploy**. En cada publicación el build aplica las migraciones pendientes
   (`scripts/migrate.mjs`) y genera el cliente de Prisma, así que la base se
   mantiene al día sola.
5. La primera vez, cargá los datos iniciales (sedes y usuarios de prueba): desde tu
   computadora con el mismo `DATABASE_URL` en `.env`, `npm run db:seed`; o ejecutá
   el SQL de `prisma/seed.sql` en el editor SQL de Neon.

### Uso desde el celular

Todos los adjuntos (foto del problema, presupuesto, factura, comprobante) tienen un
botón **Sacar foto** que abre la cámara directo y otro para elegir de la galería o
un PDF. Las fotos se comprimen en el teléfono antes de subir (máx. 1600 px, JPEG),
así una foto de 8 MB viaja como ~300 KB. Las pantallas se adaptan a pantalla chica.

### Archivos adjuntos (Vercel Blob)

En Vercel no hay disco, así que los adjuntos van a **Vercel Blob** (1 GB gratis).
Una sola vez: en el proyecto de Vercel → pestaña **Storage** → **Create Database**
→ **Blob** → nombre cualquiera → **Create** → **Connect to project**. Eso crea la
variable `BLOB_READ_WRITE_TOKEN`; después hacé un **Redeploy** (Deployments → ⋯ →
Redeploy) para que la tome. En local, sin esa variable, se guardan en `public/uploads/`.

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
    login/  salir/
    (app)/usuarios/        administración de usuarios (Gerente)
    (app)/cuenta/          cambio de contraseña propia
    (app)/tickets/         lista · nuevo · detalle
    (app)/dashboard/tesoreria/
    api/
      tickets/             POST alta · transition · [id]/quotes · [id]/priority
      quotes/[id]/         review (Gerente) · invoice (Mantenimiento)
      invoices/[id]/payment  (Tesorería)
      users/               alta · [id] rol/activo · [id]/reset-password
      account/password/
      upload/
  components/
    tickets/ presupuestos/ facturas/ tesoreria/ layout/
```
