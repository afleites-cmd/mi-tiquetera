"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MIN_PASSWORD } from "@/lib/passwords";

export function CambiarPassword({ forzado }: { forzado: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== repeat) return setError("Las contraseñas nuevas no coinciden.");
    if (next.length < MIN_PASSWORD) return setError(`La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "No se pudo cambiar.");
      setOk(true);
      setCurrent(""); setNext(""); setRepeat("");
      if (forzado) { router.push("/tickets"); router.refresh(); }
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
      {forzado && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Estás usando una contraseña provisoria. Elegí una propia para continuar.
        </p>
      )}
      <label className="block"><span className={label}>Contraseña actual</span><input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} /></label>
      <label className="block"><span className={label}>Nueva contraseña (mín. {MIN_PASSWORD})</span><input type="password" required autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={input} /></label>
      <label className="block"><span className={label}>Repetir nueva contraseña</span><input type="password" required autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={input} /></label>
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && !forzado && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Contraseña actualizada.</p>}
      <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {busy ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
