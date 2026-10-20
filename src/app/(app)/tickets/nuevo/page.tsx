import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { FormularioTicket } from "@/components/tickets/FormularioTicket";

export const dynamic = "force-dynamic";

export default async function NuevoTicketPage() {
  await requirePermission("CREAR_TICKETS");
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-4 text-2xl font-bold">Nuevo ticket</h1>
      <FormularioTicket locations={locations} />
    </main>
  );
}
