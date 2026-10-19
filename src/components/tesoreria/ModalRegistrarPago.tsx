"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { uploadFile } from "@/lib/upload-client";
import type { InvoiceRow } from "./DashboardTesoreria";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "OTRO", label: "Otro" },
];

/** Tesorería adjunta el comprobante y dispara PENDIENTE_PAGO -> FINALIZADO. */
export function ModalRegistrarPago({
  invoice,
  onClose,
}: {
  invoice: InvoiceRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("TRANSFERENCIA");
  const [reference, setReference] = useState("");
  const [amountPaid, setAmountPaid] = useState(invoice.amount.toFixed(2));
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receipt) return setError("Adjuntá el comprobante de pago.");
    setError(null);
    setBusy(true);
    try {
      const receiptUrl = await uploadFile(receipt);
      const res = await fetch(`/api/invoices/${invoice.invoiceId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaid: Number(amountPaid),
          paymentMethod: method,
          reference: reference || undefined,
          receiptUrl,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "No se pudo registrar el pago.");
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Registrar pago</h3>
          <p className="text-sm text-gray-500">
            {invoice.invoiceNumber} · {invoice.supplier}
          </p>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Monto pagado</span>
          <input type="number" step="0.01" min="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className={input} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Medio de pago</span>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={input}>
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Referencia (opcional)</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Nro. de transferencia / cheque" className={input} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Comprobante (PDF / imagen)</span>
          <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
        </label>

        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {busy ? "Guardando…" : "Confirmar pago"}
          </button>
        </div>
      </form>
    </div>
  );
}
