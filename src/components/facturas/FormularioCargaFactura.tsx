"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentCondition } from "@/generated/prisma/enums";
import { PAYMENT_CONDITIONS, calculateDueDate } from "@/lib/workflow";
import { uploadFile } from "@/lib/upload-client";
import { ars, fmtDate } from "@/lib/format";

/**
 * Formulario de Carga de Factura para un presupuesto aprobado.
 * Rol: Encargado de Mantenimiento / Administrativo.
 * Flujo: sube el adjunto a /api/upload y luego POST /api/quotes/[id]/invoice.
 * Cuando todos los presupuestos aprobados del ticket tienen factura, el ticket
 * pasa a PENDIENTE_PAGO.
 */
interface Props {
  /** Presupuesto aprobado que se está facturando. */
  quote: { id: string; supplier: string; amount: number; coversLabor: boolean; coversMaterials: boolean };
  onSuccess?: () => void;
}

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_MB = 10;

export default function FormularioCargaFactura({ quote, onSuccess }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const approvedQuoteAmount = quote.amount;

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState(approvedQuoteAmount.toFixed(2));
  const [issueDate, setIssueDate] = useState(today);
  const [condition, setCondition] = useState<PaymentCondition>("INMEDIATO");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Vista previa del adjunto; el object URL se libera al cambiar o desmontar.
  useEffect(() => {
    if (!file) return setPreviewUrl(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const dueDate = useMemo(
    () => calculateDueDate(new Date(`${issueDate}T00:00:00`), condition),
    [issueDate, condition],
  );

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (!f) return setFile(null);
    if (!ALLOWED_TYPES.includes(f.type)) { setFile(null); return setError("Sólo se admiten PDF, JPG o PNG."); }
    if (f.size > MAX_MB * 1024 * 1024) { setFile(null); return setError(`El archivo supera los ${MAX_MB} MB.`); }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Adjuntá la factura.");
    if (Number(amount) <= 0) return setError("El monto debe ser mayor a cero.");

    setBusy(true);
    try {
      const fileUrl = await uploadFile(file);
      const res = await fetch(`/api/quotes/${quote.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: invoiceNumber.trim(),
          amount: Number(amount),
          condition,
          issueDate,
          fileUrl,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "No se pudo cargar la factura.");
      }
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
  const label = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Carga de factura</h2>
      <p className="mb-6 text-sm text-gray-500">
        Presupuesto de <strong>{quote.supplier}</strong> (
        {[quote.coversLabor && "mano de obra", quote.coversMaterials && "materiales"].filter(Boolean).join(" + ")}
        ). Cuando todos los presupuestos aprobados tengan factura, el ticket pasa a{" "}
        <strong>Pendiente de Pago</strong>.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Datos */}
        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="invoiceNumber">Nro. de factura</label>
            <input id="invoiceNumber" required value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="0001-00012345" className={input} />
          </div>

          <div>
            <label className={label} htmlFor="amount">Monto final</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-2 text-sm text-gray-400">$</span>
              <input id="amount" type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={`${input} pl-7`} />
            </div>
            {Number(amount) > approvedQuoteAmount && (
              <p className="mt-1 text-xs text-amber-600">
                Supera el presupuesto aprobado ({ars(approvedQuoteAmount)}).
              </p>
            )}
          </div>

          <div>
            <label className={label} htmlFor="issueDate">Fecha de emisión</label>
            <input id="issueDate" type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={input} />
          </div>

          {/* Selector de condición de pago */}
          <fieldset>
            <legend className={label}>Condición de pago</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PAYMENT_CONDITIONS) as PaymentCondition[]).map((c) => {
                const active = condition === c;
                return (
                  <label
                    key={c}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                      active ? "border-blue-600 bg-blue-50 text-blue-800" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input type="radio" name="condition" value={c} checked={active} onChange={() => setCondition(c)} className="sr-only" />
                    <span className="block font-medium">{PAYMENT_CONDITIONS[c].label}</span>
                    <span className="block text-xs text-gray-500">{PAYMENT_CONDITIONS[c].description}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Vencimiento calculado:{" "}
              <span className="font-semibold text-gray-900">{fmtDate(dueDate)}</span>
            </p>
          </fieldset>
        </div>

        {/* Adjunto + vista previa */}
        <div className="space-y-3">
          <label className={label} htmlFor="file">Factura adjunta (PDF / JPG / PNG, máx. {MAX_MB} MB)</label>
          <input
            id="file"
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={onFileChange}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
          />
          <div className="flex h-72 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
            {!previewUrl && <span className="text-sm text-gray-400">Vista previa del archivo</span>}
            {previewUrl && file?.type === "application/pdf" && (
              <iframe src={previewUrl} title="Vista previa PDF" className="h-full w-full" />
            )}
            {previewUrl && file?.type.startsWith("image/") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Vista previa de la factura" className="max-h-full max-w-full object-contain" />
            )}
          </div>
          {file && (
            <p className="truncate text-xs text-gray-500">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? "Guardando…" : "Cargar factura y enviar a Tesorería"}
        </button>
      </div>
    </form>
  );
}
