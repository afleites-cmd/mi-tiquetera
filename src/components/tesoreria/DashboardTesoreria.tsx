"use client";

import { useState } from "react";
import type { PaymentCondition, Priority } from "@/generated/prisma/enums";
import { ModalRegistrarPago } from "./ModalRegistrarPago";
import { BotonEliminar } from "@/components/ui/BotonEliminar";
import { SemaforoBadge } from "@/components/tickets/Semaforo";
import { fmtDate } from "@/lib/format";

export interface InvoiceRow {
  invoiceId: string;
  ticketId: string;
  invoiceNumber: string;
  supplier: string;
  priority: Priority;
  location: string;
  description: string;
  amount: number;
  condition: PaymentCondition;
  conditionLabel: string;
  dueDate: string;
  daysLeft: number;
  paid: boolean;
  paymentDate: string | null;
  fileUrl: string;
  receiptUrl: string | null;
}

export interface InvoiceGroups {
  dueSoon: InvoiceRow[];
  currentAccount: InvoiceRow[];
  upcoming: InvoiceRow[];
  paid: InvoiceRow[];
}

const ars = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const sum = (rows: InvoiceRow[]) => rows.reduce((s, r) => s + r.amount, 0);

function DueBadge({ days }: { days: number }) {
  const cls =
    days < 0
      ? "bg-red-100 text-red-700"
      : days <= 2
        ? "bg-orange-100 text-orange-700"
        : days <= 5
          ? "bg-amber-100 text-amber-700"
          : "bg-gray-100 text-gray-600";
  const txt =
    days < 0 ? `Vencida hace ${-days} d` : days === 0 ? "Vence hoy" : `En ${days} d`;
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>{txt}</span>
  );
}

function ConditionBadge({ row }: { row: InvoiceRow }) {
  const cls =
    row.condition === "INMEDIATO"
      ? "bg-red-100 text-red-700"
      : row.condition === "CUENTA_CORRIENTE"
        ? "bg-purple-100 text-purple-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>
      {row.conditionLabel}
    </span>
  );
}

function Kpi({ title, rows, tone }: { title: string; rows: InvoiceRow[]; tone: string }) {
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{title}</p>
      <p className="mt-1 text-2xl font-bold">{rows.length}</p>
      <p className="text-sm opacity-80">{ars(sum(rows))}</p>
    </div>
  );
}

const TABS: { key: keyof InvoiceGroups; label: string }[] = [
  { key: "dueSoon", label: "Vencen en 5 días" },
  { key: "currentAccount", label: "Cuenta Corriente" },
  { key: "upcoming", label: "Próximas" },
  { key: "paid", label: "Pagadas" },
];

export function DashboardTesoreria({ groups, canPay }: { groups: InvoiceGroups; canPay: boolean }) {
  const [tab, setTab] = useState<keyof InvoiceGroups>("dueSoon");
  const [selected, setSelected] = useState<InvoiceRow | null>(null);
  const rows = groups[tab];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-3xl font-bold text-gray-800">Panel de Tesorería y Vencimientos</h1>
        <p className="mb-6 text-gray-600">
          Gestión de pagos pendientes, facturas y liquidación de cuentas corrientes.
        </p>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi title="Vencen en 5 días" rows={groups.dueSoon} tone="border-red-200 bg-red-50 text-red-900" />
          <Kpi title="Cuenta Corriente" rows={groups.currentAccount} tone="border-purple-200 bg-purple-50 text-purple-900" />
          <Kpi title="Próximas" rows={groups.upcoming} tone="border-gray-200 bg-white text-gray-900" />
          <Kpi title="Pagadas (60 d)" rows={groups.paid} tone="border-emerald-200 bg-emerald-50 text-emerald-900" />
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "bg-blue-600 text-white shadow-md"
                  : "border bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.label} ({groups[t.key].length})
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead className="border-b border-gray-200 bg-gray-100 text-xs font-semibold uppercase text-gray-600">
              <tr>
                <th className="p-4">N° Factura</th>
                <th className="p-4">Proveedor / Sede</th>
                <th className="p-4">Condición</th>
                <th className="p-4">{tab === "paid" ? "Pagada el" : "Vencimiento"}</th>
                <th className="p-4 text-right">Monto</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-400">
                    Nada pendiente en este grupo.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.invoiceId} className="hover:bg-gray-50">
                  <td className="p-4 font-mono font-medium text-gray-900">
                    <a href={r.fileUrl} target="_blank" rel="noreferrer" className="hover:underline">
                      {r.invoiceNumber}
                    </a>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-medium">
                      {r.supplier}
                      {r.priority === "ROJO" && <SemaforoBadge priority="ROJO" />}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.location} · <span className="truncate">{r.description}</span>
                    </div>
                  </td>
                  <td className="p-4"><ConditionBadge row={r} /></td>
                  <td className="p-4">
                    {tab === "paid" ? (
                      fmtDate(r.paymentDate)
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{fmtDate(r.dueDate)}</span>
                        <DueBadge days={r.daysLeft} />
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right font-bold tabular-nums text-gray-900">{ars(r.amount)}</td>
                  <td className="p-4 text-center">
                    {r.paid ? (
                      <div className="flex items-center justify-center gap-2">
                        <a href={r.receiptUrl ?? "#"} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-700 hover:underline">
                          Ver comprobante
                        </a>
                        {canPay && (
                          <BotonEliminar url={`/api/invoices/${r.invoiceId}/payment`} label="Anular" confirm={`¿Anular el pago de ${r.invoiceNumber}?`} />
                        )}
                      </div>
                    ) : !canPay ? (
                      <span className="text-xs text-gray-400">Pendiente</span>
                    ) : (
                      <button
                        onClick={() => setSelected(r)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        Pagar y Adjuntar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <ModalRegistrarPago invoice={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
