"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Priority } from "@/generated/prisma/enums";
import { SemaforoSelector } from "./Semaforo";
import { uploadFile } from "@/lib/upload-client";
import { AdjuntoInput } from "@/components/ui/AdjuntoInput";

export function FormularioTicket({ locations }: { locations: { id: string; name: string }[] }) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [floor, setFloor] = useState("");
  const [specificPlace, setSpecificPlace] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("VERDE");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const photoUrl = photo ? await uploadFile(photo) : undefined;
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, floor, specificPlace, description, priority, photoUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "No se pudo crear el ticket.");
      const t = await res.json();
      router.push(`/tickets/${t.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
  const label = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className={label} htmlFor="loc">Sede</label>
          <select id="loc" value={locationId} onChange={(e) => setLocationId(e.target.value)} className={input} required>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="floor">Piso</label>
          <input id="floor" required value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="PB, 1°, 2°…" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="place">Lugar específico</label>
          <input id="place" required value={specificPlace} onChange={(e) => setSpecificPlace(e.target.value)} placeholder="Baño, consultorio 3…" className={input} />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="desc">¿Qué pasa?</label>
        <textarea id="desc" required minLength={5} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={input} placeholder="Describí el problema con el mayor detalle posible." />
      </div>

      <fieldset>
        <legend className={label}>Urgencia</legend>
        <SemaforoSelector value={priority} onChange={setPriority} />
      </fieldset>

      <AdjuntoInput label="Foto del problema (opcional)" value={photo} onChange={setPhoto} allowPdf={false} />

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:py-2">
          {busy ? "Creando…" : "Crear ticket"}
        </button>
      </div>
    </form>
  );
}
