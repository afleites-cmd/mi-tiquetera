// POST /api/tickets/[id]/quotes — Mantenimiento carga un presupuesto.
// Permitido en NUEVO, EN_PRESUPUESTACION y RECHAZADO. Al cargar, el ticket
// queda en EN_PRESUPUESTACION (sale de NUEVO o de RECHAZADO automáticamente).
// GET  /api/tickets/[id]/quotes — lista los presupuestos con su cobertura.

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, assertCan, moveTicket } from "@/lib/tickets";
import { QUOTE_LOADABLE_STATUSES, quoteCoverage } from "@/lib/workflow";

const schema = z
  .object({
    supplier: z.string().trim().min(1),
    amount: z.coerce.number().positive(),
    detail: z.string().trim().max(2000).optional(),
    fileUrl: z.string().min(1),
    coversLabor: z.boolean(),
    coversMaterials: z.boolean(),
  })
  .refine((q) => q.coversLabor || q.coversMaterials, {
    message: "El presupuesto debe cubrir mano de obra, materiales o ambos",
    path: ["coversLabor"],
  });

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  const quotes = await prisma.quote.findMany({
    where: { ticketId: id },
    include: { createdBy: { select: { name: true } }, reviewedBy: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ quotes, coverage: quoteCoverage(quotes) });
}

export async function POST(req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id: ticketId } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    assertCan(user, "CARGAR_PRESUPUESTOS");

    const quote = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) throw new HttpError(404, "Ticket no encontrado");
      if (!QUOTE_LOADABLE_STATUSES.includes(ticket.status)) {
        throw new HttpError(409, `No se pueden cargar presupuestos en estado ${ticket.status}`);
      }

      const created = await tx.quote.create({
        data: {
          ticketId,
          supplier: parsed.data.supplier,
          amount: new Prisma.Decimal(parsed.data.amount),
          detail: parsed.data.detail,
          fileUrl: parsed.data.fileUrl,
          coversLabor: parsed.data.coversLabor,
          coversMaterials: parsed.data.coversMaterials,
          createdById: user.id,
        },
      });

      // NUEVO / RECHAZADO -> EN_PRESUPUESTACION
      await moveTicket(tx, ticket, "EN_PRESUPUESTACION", user, {
        comment: `Presupuesto cargado: ${created.supplier}`,
      });
      return created;
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/quotes]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
