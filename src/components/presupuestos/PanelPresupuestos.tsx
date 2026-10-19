"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuoteStatus, Role, TicketStatus } from "@/generated/prisma/enums";
import { quoteCoverage, type QuoteCoverage } from "@/lib/workflow";

/**
 * Lista de presupuestos de un ticket con el estado de cobertura.
 *  - GERENTE (ticket en PENDIENTE_APROBACION): aprueba / rechaza cada uno.
 *  - MANTENIMIENTO (EN_PRESUPUESTACION): botón "Enviar a aprobación" cuando la
 *    cobertura puede completarse.
 */
export interface QuoteItem {
  id: string;
  supplier: string;
  amount: number;
  detail: string | null;
  fileUrl: string;
  coversLabor: boolean;
  coversMaterials: boolean;
  status: QuoteStatus;
  rejectionReason: string | null;
}

interface Props {
  ticketId: string;
  ticketStatus: TicketStatus;
  userRole: Role;
  quotes: QuoteItem[];
}

const ars = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

function Coverage({ c }: { c: QuoteCoverage }) {
  const Item = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
      {ok ? "✓" : "○"} {label}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Cobertura aprobada:</span>
      <Item ok={c.laborApproved} label="Mano de obra" />
      <Item ok={c.materialsApproved} label="Materiales" />
      {c.complete && <span className="text-xs font-semibold text-emerald-700">· Completa</span>}
    </div>
  );
}

export function PanelPresupuestos({ ticketId, ticketStatus, userRole, quotes }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const coverage = quoteCoverage(quotes);

  async function review(quoteId: string, decision: "APROBADO" | "RECHAZADO") {
    let reason: string | undefined;
    if (decision === "RECHAZADO") {
      reason = window.prompt("Motivo del rechazo:")?.trim();
      if (!reason) return;
    }
    setError(null);
    setBusyId(quoteId);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "No se pudo revisar.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function sendForApproval() {
    setError(null);
    setBusyId("send");
    try {
      const res = await fetch("/api/tickets/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, targetStatus: "PENDIENTE_APROBACION" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "No se pudo enviar.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const canReview = userRole === "GERENTE" && ticketStatus === "PENDIENTE_APROBACION";
  const canSend = userRole === "MANTENIMIENTO" && ticketStatus === "EN_PRESUPUESTACION";

  const statusBadge: Record<QuoteStatus, string> = {
    PENDIENTE: "bg-amber-100 text-amber-700",
    APROBADO: "bg-emerald-100 text-emerald-700",
    RECHAZADO: "bg-red-100 text-red-700",
  };

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Presupuestos ({quotes.length})</h2>
        {canSend && (
          <button
            onClick={sendForApproval}
            disabled={!coverage.pendingCanComplete || busyId === "send"}
            title={!coverage.pendingCanComplete ? "Faltan presupuestos para cubrir mano de obra y materiales" : undefined}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar a aprobación
          </button>
        )}
      </div>

      <Coverage c={coverage} />

      {ticketStatus === "RECHAZADO" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Presupuesto rechazado sin alternativa. Cargá uno nuevo para volver a presupuestación.
        </p>
      )}

      <ul className="divide-y divide-gray-100">
        {quotes.map((q) => (
          <li key={q.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <a href={q.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-gray-900 hover:underline">{q.supplier}</a>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[q.status]}`}>{q.status}</span>
                {q.coversLabor && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Mano de obra</span>}
                {q.coversMaterials && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Materiales</span>}
              </div>
              {q.detail && <p className="mt-1 text-sm text-gray-600">{q.detail}</p>}
              {q.rejectionReason && <p className="mt-1 text-xs text-red-600">Motivo: {q.rejectionReason}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold tabular-nums text-gray-900">{ars(q.amount)}</span>
              {canReview && q.status === "PENDIENTE" && (
                <div className="flex gap-2">
                  <button onClick={() => review(q.id, "APROBADO")} disabled={busyId === q.id} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Aprobar</button>
                  <button onClick={() => review(q.id, "RECHAZADO")} disabled={busyId === q.id} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Rechazar</button>
                </div>
              )}
            </div>
          </li>
        ))}
        {quotes.length === 0 && <li className="py-6 text-center text-sm text-gray-400">Sin presupuestos cargados.</li>}
      </ul>

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
