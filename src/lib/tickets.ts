// Helpers compartidos por los Route Handlers: cambio de estado con auditoría,
// y errores HTTP tipados.

import { Permission, Prisma, TicketStatus } from "@/generated/prisma/client";
import type { SessionUser } from "./auth";
import { validateTransition } from "./workflow";
import { can } from "./permissions";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Tx = Prisma.TransactionClient;

/**
 * Cambia el estado de un ticket validando rol + flujo y dejando historial.
 * `systemMove = true` salta la validación de rol: lo usa el sistema cuando el
 * estado se deriva de una acción (p. ej. aprobar el último presupuesto autoriza
 * el ticket aunque el Gerente no tenga permiso directo para esa transición).
 */
export async function moveTicket(
  tx: Tx,
  ticket: { id: string; status: TicketStatus },
  target: TicketStatus,
  user: SessionUser,
  opts: { comment?: string; systemMove?: boolean } = {},
) {
  // Sin cambio de estado: igual dejamos constancia si hay comentario (p. ej. se
  // aprobó un presupuesto pero falta el otro rubro).
  if (ticket.status === target) {
    if (opts.comment) {
      await tx.statusHistory.create({
        data: { ticketId: ticket.id, fromStatus: ticket.status, toStatus: target, userId: user.id, comment: opts.comment },
      });
    }
    return ticket;
  }

  const allowed = opts.systemMove
    ? true
    : validateTransition(ticket.status, target, user.permissions);
  if (!allowed) {
    throw new HttpError(403, `No tenés permiso para pasar el ticket de ${ticket.status} a ${target}`);
  }

  const updated = await tx.ticket.update({
    where: { id: ticket.id },
    data: { status: target },
  });
  await tx.statusHistory.create({
    data: {
      ticketId: ticket.id,
      fromStatus: ticket.status,
      toStatus: target,
      userId: user.id,
      comment: opts.comment,
    },
  });
  return updated;
}

export function assertCan(user: SessionUser, perm: Permission) {
  if (!can(user, perm)) throw new HttpError(403, "No tenés permiso para esta acción");
}
