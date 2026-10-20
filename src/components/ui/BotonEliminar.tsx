"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Botón de borrado con confirmación; llama DELETE a `url` y refresca (o redirige). */
export function BotonEliminar({
  url,
  confirm,
  label = "Eliminar",
  redirectTo,
  className = "",
}: {
  url: string;
  confirm: string;
  label?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm(confirm)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "No se pudo eliminar.");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      window.alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={error ?? undefined}
      className={`rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 ${className}`}
    >
      {busy ? "…" : label}
    </button>
  );
}
