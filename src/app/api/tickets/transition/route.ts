// ENTREGABLE 4: Backend API — Transición de estados (movimientos explícitos)
// POST /api/tickets/transition  { ticketId, targetStatus, comment? }
//
// Transiciones que el usuario dispara a mano. Las que se derivan de datos tienen
// endpoint propio y mueven el ticket por sí solas:
//   cargar presupuesto  → POST /api/tickets/[id]/quotes     (NUEVO|RECHAZADO → EN_PRESUPUESTACION)
//   revisar presupuesto → POST /api/quotes/[id]/review       (→ AUTORIZADO | RECHAZADO)
//   cargar factura      → POST /api/quotes/[id]/invoice      (AUTORIZADO → PENDIENTE_PAGO)
//   registrar pago      → POST /api/invoices/[id]/payment    (PENDIENTE_PAGO → FINALIZADO)

import { NextResponse } from "next/server";
import { z } from "zod";
import { TicketStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, moveTicket } from "@/lib/tickets";
import { quoteCoverage } from "@/lib/workflow";

const bodySchema = z.object({
  ticketId: z.string().uuid(),
  targetStatus: z.nativeEnum(TicketStatus),
  comment: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido", details: parsed.error.flatten() }, { status: 400 });
  }
  const { ticketId, targetStatus, comment } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: { quotes: true },
      });
      if (!ticket) throw new HttpError(404, "Ticket no encontrado");

      // Enviar a aprobación: tiene que haber presupuestos pendientes que, sumados a
      // los ya aprobados, puedan cubrir mano de obra y materiales.
      if (targetStatus === "PENDIENTE_APROBACION") {
        const c = quoteCoverage(ticket.quotes);
        if (!c.pendingCanComplete) {
          throw new HttpError(
            409,
            "Faltan presupuestos: la cobertura de mano de obra y materiales está incompleta",
          );
        }
      }

      // Estas se derivan de datos y van por su endpoint específico.
      if (targetStatus === "PENDIENTE_PAGO" || targetStatus === "FINALIZADO" || targetStatus === "AUTORIZADO") {
        throw new HttpError(409, `${targetStatus} se alcanza cargando los datos correspondientes, no por transición directa`);
      }

      return moveTicket(tx, ticket, targetStatus, user, { comment });
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/transition]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
