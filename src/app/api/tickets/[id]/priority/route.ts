// PATCH /api/tickets/[id]/priority — cambia el semáforo de un ticket.
// Rol: MANTENIMIENTO o GERENTE. Si se cambia lo que puso el Solicitante, se pide
// un motivo y queda en el historial.

import { NextResponse } from "next/server";
import { z } from "zod";
import { Priority } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, assertCan } from "@/lib/tickets";
import { PRIORITIES } from "@/lib/workflow";

const schema = z.object({
  priority: z.nativeEnum(Priority),
  note: z.string().trim().max(300).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido", details: parsed.error.flatten() }, { status: 400 });
  }
  const { priority, note } = parsed.data;

  try {
    assertCan(user, "CAMBIAR_URGENCIA");

    const ticket = await prisma.$transaction(async (tx) => {
      const current = await tx.ticket.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, "Ticket no encontrado");
      if (current.status === "FINALIZADO") throw new HttpError(409, "El ticket está finalizado");
      if (current.priority === priority) return current;
      if (!note) throw new HttpError(400, "Indicá el motivo del cambio de urgencia");

      const updated = await tx.ticket.update({
        where: { id },
        data: { priority, priorityNote: note },
      });
      // Se registra en el historial sin cambiar el estado (from = to).
      await tx.statusHistory.create({
        data: {
          ticketId: id,
          fromStatus: current.status,
          toStatus: current.status,
          userId: user.id,
          comment: `Urgencia ${PRIORITIES[current.priority].label} → ${PRIORITIES[priority].label}: ${note}`,
        },
      });
      return updated;
    });

    return NextResponse.json(ticket);
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets/priority]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
