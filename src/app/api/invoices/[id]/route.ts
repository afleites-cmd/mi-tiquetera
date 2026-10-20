// DELETE /api/invoices/[id] — elimina una factura cargada por error (sin pago).
// Quien la cargó o administrador. El ticket vuelve a AUTORIZADO si estaba en PENDIENTE_PAGO.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, moveTicket } from "@/lib/tickets";
import { isAdmin } from "@/lib/permissions";
import { deleteAttachment } from "@/lib/blob";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  try {
    const fileUrl = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id }, include: { ticket: true, payment: true } });
      if (!inv) throw new HttpError(404, "Factura no encontrada");
      if (!isAdmin(user) && inv.uploadedById !== user.id) throw new HttpError(403, "Sólo podés eliminar facturas que cargaste vos");
      if (inv.payment) throw new HttpError(409, "La factura ya está paga: anulá el pago primero");

      await tx.invoice.delete({ where: { id } });
      if (inv.ticket.status === "PENDIENTE_PAGO") {
        await moveTicket(tx, inv.ticket, "AUTORIZADO", user, { systemMove: true, comment: `Factura ${inv.invoiceNumber} eliminada` });
      } else {
        await tx.statusHistory.create({ data: { ticketId: inv.ticketId, fromStatus: inv.ticket.status, toStatus: inv.ticket.status, userId: user.id, comment: `Factura ${inv.invoiceNumber} eliminada` } });
      }
      return inv.fileUrl;
    });
    await deleteAttachment(fileUrl);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[invoices/delete]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
