"use client";

import { useState } from "react";
import FormularioCargaFactura from "./FormularioCargaFactura";
import { fmtDate } from "@/lib/format";

interface ApprovedQuote {
  id: string;
  supplier: string;
  amount: number;
  coversLabor: boolean;
  coversMaterials: boolean;
  invoice: {
    invoiceNumber: string;
    amount: number;
    dueDate: string;
    fileUrl: string;
    paid: boolean;
    receiptUrl: string | null;
  } | null;
}

const ars = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

/** Por cada presupuesto aprobado: su factura (o el botón para cargarla). */
export function SeccionFacturas({ quotes, canInvoice }: { quotes: ApprovedQuote[]; canInvoice: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Facturas</h2>
      <ul className="divide-y divide-gray-100">
        {quotes.map((q) => (
          <li key={q.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-medium">{q.supplier}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {[q.coversLabor && "Mano de obra", q.coversMaterials && "Materiales"].filter(Boolean).join(" + ")} · presupuestado {ars(q.amount)}
                </span>
              </div>
              {q.invoice ? (
                <div className="flex items-center gap-3 text-sm">
                  <a href={q.invoice.fileUrl} target="_blank" rel="noreferrer" className="font-mono text-blue-700 hover:underline">{q.invoice.invoiceNumber}</a>
                  <span className="font-semibold">{ars(q.invoice.amount)}</span>
                  <span className="text-gray-500">vence {fmtDate(q.invoice.dueDate)}</span>
                  {q.invoice.paid ? (
                    <a href={q.invoice.receiptUrl ?? "#"} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:underline">Pagada · comprobante</a>
                  ) : (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">Pendiente de pago</span>
                  )}
                </div>
              ) : canInvoice ? (
                <button onClick={() => setLoading(loading === q.id ? null : q.id)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                  {loading === q.id ? "Cerrar" : "Cargar factura"}
                </button>
              ) : (
                <span className="text-xs text-gray-400">Sin factura aún</span>
              )}
            </div>
            {loading === q.id && (
              <div className="mt-4">
                <FormularioCargaFactura quote={q} onSuccess={() => setLoading(null)} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
