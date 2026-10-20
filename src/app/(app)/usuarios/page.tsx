import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PanelUsuarios } from "@/components/usuarios/PanelUsuarios";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const me = await requirePermission("ADMINISTRAR_USUARIOS");
  const usuarios = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, permissions: true, active: true, mustChangePassword: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <PanelUsuarios usuarios={usuarios} meId={me.id} />
    </main>
  );
}
