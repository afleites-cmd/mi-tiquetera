"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Priority } from "@/generated/prisma/enums";
import { SemaforoSelector } from "./Semaforo";

export function CambiarUrgencia({ ticketId, current }: { ticketId: string; current: Priority }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<Priority>(current);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority, note: note.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "No se pudo cambiar.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
        Cambiar urgencia
      </button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:w-auto md:min-w-[28rem]">
      <SemaforoSelector value={priority} onChange={setPriority} />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Motivo del cambio"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
        <button onClick={save} disabled={busy || priority === current} className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Guardar
        </button>
      </div>
    </div>
  );
}
