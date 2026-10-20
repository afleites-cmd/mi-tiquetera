import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { Nav } from "@/components/layout/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  if (!user.active) redirect("/salir?motivo=inactivo");
  // Contraseña provisoria: sólo se puede estar en /cuenta hasta cambiarla.
  const path = (await headers()).get("x-pathname") ?? "";
  if (user.mustChangePassword && !path.startsWith("/cuenta")) redirect("/cuenta");

  return (
    <>
      <Nav user={user} />
      {children}
    </>
  );
}
