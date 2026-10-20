// DELETE /api/quotes/[id] — elimina un presupuesto cargado por error.
// Quien lo cargó: mientras esté PENDIENTE. Administrador: siempre (si tiene factura, primero hay que borrarla).
// El ticket se reacomoda: sin presupuestos → NUEVO; si estaba en aprobación y ya no puede completarse → EN_PRESUPUESTACION.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, moveTicket } from "@/lib/tickets";
import { isAdmin } from "@/lib/permissions";
import { quoteCoverage } from "@/lib/workflow";
import { deleteAttachment } from "@/lib/blob";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  try {
    const fileUrl = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id }, include: { ticket: true, invoice: true } });
      if (!quote) throw new HttpError(404, "Presupuesto no encontrado");
      const own = quote.createdById === user.id;
      if (!isAdmin(user) && !(own && quote.status === "PENDIENTE")) {
        throw new HttpError(403, "Sólo podés eliminar tus presupuestos mientras están pendientes");
      }
      if (quote.invoice) throw new HttpError(409, "Este presupuesto tiene factura: eliminá la factura primero");

      await tx.quote.delete({ where: { id } });

      const rest = await tx.quote.findMany({ where: { ticketId: quote.ticketId } });
      const t = quote.ticket;
      let target = t.status;
      if (rest.length === 0 && t.status !== "FINALIZADO") target = "NUEVO";
      else if (t.status === "PENDIENTE_APROBACION" && !quoteCoverage(rest).pendingCanComplete) target = "EN_PRESUPUESTACION";
      else if (t.status === "AUTORIZADO" && !quoteCoverage(rest).complete) target = "EN_PRESUPUESTACION";
      await moveTicket(tx, t, target, user, { systemMove: true, comment: `Presupuesto eliminado: ${quote.supplier}` });
      return quote.fileUrl;
    });
    await deleteAttachment(fileUrl);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[quotes/delete]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
