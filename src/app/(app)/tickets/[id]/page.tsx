import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PRIORITIES } from "@/lib/workflow";
import { can, isAdmin } from "@/lib/permissions";
import { BotonEliminar } from "@/components/ui/BotonEliminar";
import { SemaforoBadge } from "@/components/tickets/Semaforo";
import { EstadoBadge, ESTADO } from "@/components/tickets/EstadoBadge";
import { CambiarUrgencia } from "@/components/tickets/CambiarUrgencia";
import { PanelPresupuestos } from "@/components/presupuestos/PanelPresupuestos";
import FormularioPresupuesto from "@/components/presupuestos/FormularioPresupuesto";
import { SeccionFacturas } from "@/components/facturas/SeccionFacturas";
import { fmtDate, fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      location: true,
      createdBy: { select: { name: true } },
      quotes: { orderBy: { createdAt: "asc" }, include: { invoice: { include: { payment: true } } } },
      history: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } },
    },
  });
  if (!ticket) notFound();
  if (!can(user, "VER_TODOS_LOS_TICKETS") && ticket.createdById !== user.id) notFound();

  const canLoadQuote =
    can(user, "CARGAR_PRESUPUESTOS") && ["NUEVO", "EN_PRESUPUESTACION", "RECHAZADO"].includes(ticket.status);
  const canEditPriority = can(user, "CAMBIAR_URGENCIA") && ticket.status !== "FINALIZADO";
  const admin = isAdmin(user);
  const canDeleteTicket = admin || (ticket.createdById === user.id && ticket.status === "NUEVO");

  const quotes = ticket.quotes.map((q) => ({
    id: q.id, supplier: q.supplier, amount: q.amount.toNumber(), detail: q.detail, fileUrl: q.fileUrl,
    coversLabor: q.coversLabor, coversMaterials: q.coversMaterials, status: q.status, rejectionReason: q.rejectionReason,
    canDelete: !q.invoice && (admin || (q.createdById === user.id && q.status === "PENDIENTE")),
  }));

  const approvedQuotes = ticket.quotes
    .filter((q) => q.status === "APROBADO")
    .map((q) => ({
      id: q.id, supplier: q.supplier, amount: q.amount.toNumber(), coversLabor: q.coversLabor, coversMaterials: q.coversMaterials,
      invoice: q.invoice
        ? {
            id: q.invoice.id, invoiceNumber: q.invoice.invoiceNumber, amount: q.invoice.amount.toNumber(), dueDate: q.invoice.dueDate.toISOString(), fileUrl: q.invoice.fileUrl,
            paid: !!q.invoice.payment, receiptUrl: q.invoice.payment?.receiptUrl ?? null,
            canDelete: !q.invoice.payment && (admin || q.invoice.uploadedById === user.id),
            canVoidPayment: !!q.invoice.payment && (admin || can(user, "REGISTRAR_PAGOS")),
          }
        : null,
    }));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Cabecera */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <SemaforoBadge priority={ticket.priority} size="lg" />
              <EstadoBadge status={ticket.status} />
            </div>
            <h1 className="text-xl font-bold">{ticket.location.name} · {ticket.floor} · {ticket.specificPlace}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Creado por {ticket.createdBy.name} el {fmtDate(ticket.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {canEditPriority && <CambiarUrgencia ticketId={ticket.id} current={ticket.priority} />}
            {canDeleteTicket && (
              <BotonEliminar
                url={`/api/tickets/${ticket.id}`}
                label="Eliminar ticket"
                redirectTo="/tickets"
                confirm={ticket.status === "NUEVO" ? "¿Eliminar este ticket?" : "Este ticket ya tiene presupuestos/facturas/pagos. Se eliminará TODO. ¿Continuar?"}
              />
            )}
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-gray-800">{ticket.description}</p>
        {ticket.priorityNote && (
          <p className="mt-2 text-xs text-gray-500">Nota de urgencia ({PRIORITIES[ticket.priority].label}): {ticket.priorityNote}</p>
        )}
        {ticket.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ticket.photoUrl} alt="Foto del problema" className="mt-4 max-h-80 rounded-lg border" />
        )}
      </section>

      {/* Presupuestos */}
      <PanelPresupuestos
        ticketId={ticket.id}
        ticketStatus={ticket.status}
        canReview={can(user, "APROBAR_PRESUPUESTOS")}
        canSend={can(user, "CARGAR_PRESUPUESTOS")}
        quotes={quotes}
      />
      {canLoadQuote && <FormularioPresupuesto ticketId={ticket.id} />}

      {/* Facturas (desde AUTORIZADO en adelante) */}
      {["AUTORIZADO", "PENDIENTE_PAGO", "FINALIZADO"].includes(ticket.status) && (
        <SeccionFacturas quotes={approvedQuotes} canInvoice={can(user, "CARGAR_FACTURAS")} />
      )}

      {/* Historial */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Historial</h2>
        <ol className="space-y-2 text-sm">
          {ticket.history.map((h) => (
            <li key={h.id} className="flex gap-3">
              <span className="w-32 shrink-0 text-xs text-gray-400">{fmtDateTime(h.createdAt)}</span>
              <span>
                <span className="font-medium">{h.user.name}</span>
                {h.fromStatus !== h.toStatus && (
                  <> → <span className="font-medium">{ESTADO[h.toStatus].label}</span></>
                )}
                {h.comment && <span className="text-gray-600"> · {h.comment}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
