// Aplica las migraciones pendientes antes del build (Vercel) o a pedido (npm run db:deploy).
// Prisma recomienda una conexión directa (sin pooler) para migrar: si no hay DIRECT_URL,
// se deriva de DATABASE_URL quitando "-pooler" del host (convención de Neon).
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("migrate: falta DATABASE_URL");
  process.exit(1);
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = url.replace("-pooler.", ".");
}

console.log("migrate: aplicando migraciones pendientes…");
const r = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env: process.env, shell: true });
process.exit(r.status ?? 1);
