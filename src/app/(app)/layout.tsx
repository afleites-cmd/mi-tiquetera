import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/layout/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Contraseña provisoria: sólo se puede estar en /cuenta hasta cambiarla.
  const db = await prisma.user.findUnique({ where: { id: user.id }, select: { mustChangePassword: true, active: true } });
  if (!db?.active) redirect("/salir?motivo=inactivo");
  const path = (await headers()).get("x-pathname") ?? "";
  if (db.mustChangePassword && !path.startsWith("/cuenta")) redirect("/cuenta");

  return (
    <>
      <Nav user={user} />
      {children}
    </>
  );
}
