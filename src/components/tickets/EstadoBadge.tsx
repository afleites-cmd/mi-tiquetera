import type { TicketStatus } from "@/generated/prisma/client";

export const ESTADO: Record<TicketStatus, { label: string; cls: string }> = {
  NUEVO: { label: "Nuevo", cls: "bg-gray-100 text-gray-700" },
  EN_PRESUPUESTACION: { label: "En presupuestación", cls: "bg-blue-100 text-blue-700" },
  PENDIENTE_APROBACION: { label: "Pendiente de aprobación", cls: "bg-amber-100 text-amber-700" },
  AUTORIZADO: { label: "Autorizado", cls: "bg-indigo-100 text-indigo-700" },
  PENDIENTE_PAGO: { label: "Pendiente de pago", cls: "bg-purple-100 text-purple-700" },
  FINALIZADO: { label: "Finalizado", cls: "bg-emerald-100 text-emerald-700" },
  RECHAZADO: { label: "Rechazado", cls: "bg-red-100 text-red-700" },
};

export function EstadoBadge({ status }: { status: TicketStatus }) {
  const e = ESTADO[status];
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${e.cls}`}>{e.label}</span>;
}
