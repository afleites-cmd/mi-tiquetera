import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { FormularioTicket } from "@/components/tickets/FormularioTicket";

export const dynamic = "force-dynamic";

export default async function NuevoTicketPage() {
  await requireRole(["SOLICITANTE", "MANTENIMIENTO"]);
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Nuevo ticket</h1>
      <FormularioTicket locations={locations} />
    </main>
  );
}
