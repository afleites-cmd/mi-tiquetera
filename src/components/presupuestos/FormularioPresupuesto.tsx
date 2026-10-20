"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/upload-client";
import { AdjuntoInput } from "@/components/ui/AdjuntoInput";

/**
 * Carga de presupuesto — Rol: Encargado de Mantenimiento.
 * Un presupuesto cubre Mano de obra, Materiales, o ambos (se tildan los dos).
 */
export default function FormularioPresupuesto({
  ticketId,
  onSuccess,
}: {
  ticketId: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState("");
  const [detail, setDetail] = useState("");
  const [coversLabor, setCoversLabor] = useState(false);
  const [coversMaterials, setCoversMaterials] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!coversLabor && !coversMaterials) return setError("Indicá qué cubre el presupuesto.");
    if (!file) return setError("Adjuntá el presupuesto.");

    setBusy(true);
    try {
      const fileUrl = await uploadFile(file);
      const res = await fetch(`/api/tickets/${ticketId}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: supplier.trim(),
          amount: Number(amount),
          detail: detail.trim() || undefined,
          fileUrl,
          coversLabor,
          coversMaterials,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "No se pudo cargar el presupuesto.");
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

  const CheckCard = ({ checked, onChange, title, hint }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint: string }) => (
    <label className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 ${checked ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-blue-600" />
      <span>
        <span className="block text-sm font-medium text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Nuevo presupuesto</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={label} htmlFor="supplier">Proveedor</label>
          <input id="supplier" required value={supplier} onChange={(e) => setSupplier(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="qamount">Monto</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-2 text-sm text-gray-400">$</span>
            <input id="qamount" type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={`${input} pl-7`} />
          </div>
        </div>
      </div>

      <fieldset>
        <legend className={label}>¿Qué cubre este presupuesto?</legend>
        <div className="grid gap-2 md:grid-cols-2">
          <CheckCard checked={coversLabor} onChange={setCoversLabor} title="Mano de obra" hint="Trabajo del proveedor" />
          <CheckCard checked={coversMaterials} onChange={setCoversMaterials} title="Materiales" hint="Insumos y repuestos" />
        </div>
        {coversLabor && coversMaterials && (
          <p className="mt-2 text-xs text-blue-700">Presupuesto integral: cubre mano de obra y materiales.</p>
        )}
      </fieldset>

      <div>
        <label className={label} htmlFor="detail">Detalle (opcional)</label>
        <textarea id="detail" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} className={input} />
      </div>

      <AdjuntoInput label="Presupuesto (foto o PDF)" value={file} onChange={setFile} required />

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? "Guardando…" : "Cargar presupuesto"}
        </button>
      </div>
    </form>
  );
}
