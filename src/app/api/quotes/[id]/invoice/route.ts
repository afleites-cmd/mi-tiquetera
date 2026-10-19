// POST /api/quotes/[id]/invoice — carga de factura para un presupuesto aprobado.
// Rol: MANTENIMIENTO. Ticket en AUTORIZADO (o ya en PENDIENTE_PAGO si falta la
// factura del otro rubro). Cuando todos los presupuestos aprobados tienen factura,
// el ticket pasa a PENDIENTE_PAGO.

import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentCondition, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, assertRole, moveTicket } from "@/lib/tickets";
import { calculateDueDate } from "@/lib/workflow";

const schema = z.object({
  invoiceNumber: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  condition: z.nativeEnum(PaymentCondition),
  issueDate: z.coerce.date().optional(),
  fileUrl: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id: quoteId } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    assertRole(user, ["MANTENIMIENTO"]);

    const invoice = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({
        where: { id: quoteId },
        include: { ticket: true, invoice: true },
      });
      if (!quote) throw new HttpError(404, "Presupuesto no encontrado");
      if (quote.status !== "APROBADO") throw new HttpError(409, "Sólo se factura un presupuesto aprobado");
      if (quote.invoice) throw new HttpError(409, "Este presupuesto ya tiene factura");
      if (!["AUTORIZADO", "PENDIENTE_PAGO"].includes(quote.ticket.status)) {
        throw new HttpError(409, `El ticket no admite facturas en estado ${quote.ticket.status}`);
      }

      const issueDate = data.issueDate ?? new Date();
      const created = await tx.invoice.create({
        data: {
          ticketId: quote.ticketId,
          quoteId,
          invoiceNumber: data.invoiceNumber,
          amount: new Prisma.Decimal(data.amount),
          condition: data.condition,
          issueDate,
          dueDate: calculateDueDate(issueDate, data.condition),
          fileUrl: data.fileUrl,
          uploadedById: user.id,
        },
      });

      // ¿Quedan presupuestos aprobados sin factura? Si no, a Tesorería.
      const missing = await tx.quote.count({
        where: { ticketId: quote.ticketId, status: "APROBADO", invoice: null },
      });
      if (missing === 0) {
        await moveTicket(tx, quote.ticket, "PENDIENTE_PAGO", user, {
          comment: `Factura ${created.invoiceNumber} cargada (${quote.supplier})`,
        });
      }
      return created;
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[quotes/invoice]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
