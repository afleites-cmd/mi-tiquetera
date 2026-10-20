// DELETE /api/tickets/[id] — elimina un ticket cargado por error.
// Quien lo creó: sólo mientras está NUEVO. Administrador: en cualquier estado.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError } from "@/lib/tickets";
import { isAdmin } from "@/lib/permissions";
import { deleteAttachment } from "@/lib/blob";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { quotes: { include: { invoice: { include: { payment: true } } } } },
    });
    if (!ticket) throw new HttpError(404, "Ticket no encontrado");

    const own = ticket.createdById === user.id;
    if (!isAdmin(user) && !(own && ticket.status === "NUEVO")) {
      throw new HttpError(403, "Sólo podés eliminar tus tickets mientras están en estado Nuevo");
    }

    await prisma.ticket.delete({ where: { id } }); // cascade: presupuestos, facturas, pagos, historial

    const urls = [ticket.photoUrl, ...ticket.quotes.flatMap((q) => [q.fileUrl, q.invoice?.fileUrl, q.invoice?.payment?.receiptUrl])];
    await Promise.all(urls.map(deleteAttachment));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/delete]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
