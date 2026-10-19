// POST /api/quotes/[id]/review — el Gerente aprueba o rechaza un presupuesto.
// Body: { decision: "APROBADO" | "RECHAZADO", reason?: string }
//
// Tras la decisión, el estado del ticket se deriva de la cobertura:
//   aprobados cubren mano de obra + materiales → AUTORIZADO
//   pendientes aún pueden completar            → sigue PENDIENTE_APROBACION
//   sin forma de completar                     → RECHAZADO (Mantenimiento carga otro)

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, assertRole, moveTicket } from "@/lib/tickets";
import { quoteCoverage, statusAfterReview } from "@/lib/workflow";

const schema = z
  .object({
    decision: z.enum(["APROBADO", "RECHAZADO"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((b) => b.decision === "APROBADO" || !!b.reason, {
    message: "Indicá el motivo del rechazo",
    path: ["reason"],
  });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id: quoteId } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido", details: parsed.error.flatten() }, { status: 400 });
  }
  const { decision, reason } = parsed.data;

  try {
    assertRole(user, ["GERENTE"]);

    const result = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({
        where: { id: quoteId },
        include: { ticket: true },
      });
      if (!quote) throw new HttpError(404, "Presupuesto no encontrado");
      if (quote.status !== "PENDIENTE") throw new HttpError(409, "El presupuesto ya fue revisado");
      if (quote.ticket.status !== "PENDIENTE_APROBACION") {
        throw new HttpError(409, `El ticket no está pendiente de aprobación (${quote.ticket.status})`);
      }

      // Evitar aprobar dos presupuestos que cubran el mismo rubro.
      if (decision === "APROBADO") {
        const already = await tx.quote.findMany({
          where: { ticketId: quote.ticketId, status: "APROBADO" },
        });
        const dupLabor = quote.coversLabor && already.some((q) => q.coversLabor);
        const dupMat = quote.coversMaterials && already.some((q) => q.coversMaterials);
        if (dupLabor || dupMat) {
          throw new HttpError(
            409,
            `Ya hay un presupuesto aprobado para ${dupLabor ? "mano de obra" : "materiales"}`,
          );
        }
      }

      await tx.quote.update({
        where: { id: quoteId },
        data: {
          status: decision,
          rejectionReason: decision === "RECHAZADO" ? reason : null,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });

      const quotes = await tx.quote.findMany({ where: { ticketId: quote.ticketId } });
      const nextStatus = statusAfterReview(quotes);
      const ticket = await moveTicket(tx, quote.ticket, nextStatus, user, {
        systemMove: true,
        comment:
          decision === "APROBADO"
            ? `Presupuesto aprobado: ${quote.supplier}`
            : `Presupuesto rechazado: ${quote.supplier} — ${reason}`,
      });

      return { ticket, coverage: quoteCoverage(quotes) };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[quotes/review]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
