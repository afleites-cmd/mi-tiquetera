import Link from "next/link";
import type { TicketStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { byPriorityThenAge } from "@/lib/workflow";
import { can } from "@/lib/permissions";
import { SemaforoBadge } from "@/components/tickets/Semaforo";
import { EstadoBadge } from "@/components/tickets/EstadoBadge";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Qué ve cada rol por defecto: lo que tiene que atender. */
const DEFAULT_FILTER: Record<string, TicketStatus[] | null> = {
  SOLICITANTE: null, // sólo los propios (ver where)
  MANTENIMIENTO: ["NUEVO", "EN_PRESUPUESTACION", "RECHAZADO", "AUTORIZADO"],
  GERENTE: ["PENDIENTE_APROBACION"],
  TESORERIA: ["PENDIENTE_PAGO"],
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ todos?: string; denied?: string }>;
}) {
  const user = await requireUser();
  const { todos, denied } = await searchParams;

  const veTodos = can(user, "VER_TODOS_LOS_TICKETS");
  const statuses = todos || !veTodos ? null : DEFAULT_FILTER[user.role];
  const tickets = (
    await prisma.ticket.findMany({
      where: {
        ...(veTodos ? {} : { createdById: user.id }),
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: { location: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
  ).sort(byPriorityThenAge);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      {denied && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">No tenés permiso para esa sección.</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Tickets</h1>
          {can(user, "CREAR_TICKETS") && (
            <Link href="/tickets/nuevo" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
              + Nuevo ticket
            </Link>
          )}
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/tickets" className={`rounded-lg px-3 py-1.5 ${!todos ? "bg-blue-600 text-white" : "border bg-white"}`}>
            {veTodos ? "Para mí" : "Mis tickets"}
          </Link>
          {veTodos && (
            <Link href="/tickets?todos=1" className={`rounded-lg px-3 py-1.5 ${todos ? "bg-blue-600 text-white" : "border bg-white"}`}>
              Todos
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-xs font-semibold uppercase text-gray-600">
            <tr>
              <th className="p-3">Urgencia</th>
              <th className="hidden p-3 sm:table-cell">Sede / Lugar</th>
              <th className="p-3">Descripción</th>
              <th className="p-3">Estado</th>
              <th className="hidden p-3 md:table-cell">Creado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">No hay tickets en esta vista.</td></tr>
            )}
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="p-3"><SemaforoBadge priority={t.priority} /></td>
                <td className="hidden p-3 sm:table-cell">
                  <div className="font-medium">{t.location.name}</div>
                  <div className="text-xs text-gray-500">{t.floor} · {t.specificPlace}</div>
                </td>
                <td className="p-3">
                  <Link href={`/tickets/${t.id}`} className="line-clamp-2 text-blue-700 hover:underline">{t.description}</Link>
                  <div className="text-xs text-gray-400">
                    <span className="sm:hidden">{t.location.name} · {t.specificPlace} · </span>por {t.createdBy.name}
                  </div>
                </td>
                <td className="p-3"><EstadoBadge status={t.status} /></td>
                <td className="hidden p-3 text-gray-500 md:table-cell">{fmtDate(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
