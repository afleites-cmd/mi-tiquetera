// POST   /api/invoices/[id]/payment — registra el pago y adjunta comprobante (REGISTRAR_PAGOS).
//        Cuando todas las facturas del ticket están pagas → FINALIZADO.
// DELETE /api/invoices/[id]/payment — anula un pago registrado por error (REGISTRAR_PAGOS o admin).
//        El ticket vuelve a PENDIENTE_PAGO.

import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentMethod, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, assertCan, moveTicket } from "@/lib/tickets";
import { isAdmin } from "@/lib/permissions";
import { deleteAttachment } from "@/lib/blob";

const schema = z.object({
  amountPaid: z.coerce.number().positive().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().max(100).optional(),
  receiptUrl: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id: invoiceId } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    assertCan(user, "REGISTRAR_PAGOS");

    const payment = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { ticket: true, payment: true },
      });
      if (!invoice) throw new HttpError(404, "Factura no encontrada");
      if (invoice.payment) throw new HttpError(409, "La factura ya fue pagada");
      if (invoice.ticket.status !== "PENDIENTE_PAGO") {
        throw new HttpError(409, `El ticket no está pendiente de pago (${invoice.ticket.status})`);
      }

      const created = await tx.payment.create({
        data: {
          invoiceId,
          amountPaid: data.amountPaid !== undefined ? new Prisma.Decimal(data.amountPaid) : invoice.amount,
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          receiptUrl: data.receiptUrl,
          registeredById: user.id,
        },
      });

      const unpaid = await tx.invoice.count({
        where: { ticketId: invoice.ticketId, payment: null },
      });
      if (unpaid === 0) {
        await moveTicket(tx, invoice.ticket, "FINALIZADO", user, {
          comment: `Pago registrado para factura ${invoice.invoiceNumber}`,
        });
      }
      return created;
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[invoices/payment]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id: invoiceId } = await params;

  try {
    if (!isAdmin(user)) assertCan(user, "REGISTRAR_PAGOS");
    const receiptUrl = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { ticket: true, payment: true } });
      if (!inv) throw new HttpError(404, "Factura no encontrada");
      if (!inv.payment) throw new HttpError(409, "La factura no tiene pago registrado");
      await tx.payment.delete({ where: { id: inv.payment.id } });
      await moveTicket(tx, inv.ticket, "PENDIENTE_PAGO", user, { systemMove: true, comment: `Pago anulado: factura ${inv.invoiceNumber}` });
      return inv.payment.receiptUrl;
    });
    await deleteAttachment(receiptUrl);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[payment/delete]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
