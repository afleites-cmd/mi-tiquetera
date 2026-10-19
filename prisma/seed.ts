// Datos iniciales: sedes y un usuario por rol (contraseña "1234" para todos).
// Ejecutar: npm run db:seed
import "dotenv/config";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SEDES = ["Sede Central", "Sucursal Norte", "Sucursal Sur"];

const USERS: { email: string; name: string; role: Role }[] = [
  { email: "solicitante@demo.com", name: "Sofía Solicitante", role: "SOLICITANTE" },
  { email: "mantenimiento@demo.com", name: "Martín Mantenimiento", role: "MANTENIMIENTO" },
  { email: "gerente@demo.com", name: "Gabriela Gerente", role: "GERENTE" },
  { email: "tesoreria@demo.com", name: "Tomás Tesorería", role: "TESORERIA" },
];

async function main() {
  for (const name of SEDES) {
    await prisma.location.upsert({ where: { name }, update: {}, create: { name } });
  }

  const passwordHash = await hash("1234", 10);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { ...u, passwordHash },
    });
  }

  console.log("Seed listo. Usuarios (contraseña 1234):");
  USERS.forEach((u) => console.log(`  ${u.role.padEnd(14)} ${u.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
