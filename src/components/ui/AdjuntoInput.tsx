"use client";

import { useEffect, useState } from "react";

/**
 * Selector de adjunto pensado para celular:
 *  - "Sacar foto" abre la cámara directo (capture="environment")
 *  - "Elegir archivo" abre galería / archivos (PDF si se permite)
 * Muestra vista previa de imagen o PDF.
 */
export function AdjuntoInput({
  value,
  onChange,
  allowPdf = true,
  label,
  required,
}: {
  value: File | null;
  onChange: (f: File | null) => void;
  allowPdf?: boolean;
  label: string;
  required?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return setPreview(null);
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const accept = allowPdf ? "image/jpeg,image/png,application/pdf" : "image/jpeg,image/png";

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = ""; // permite volver a elegir el mismo archivo
    setError(null);
    if (!f) return;
    if (!accept.split(",").includes(f.type)) return setError(allowPdf ? "Sólo fotos (JPG/PNG) o PDF." : "Sólo fotos (JPG/PNG).");
    if (f.size > 25 * 1024 * 1024) return setError("El archivo supera los 25 MB.");
    onChange(f);
  }

  const btn = "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100";

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      <div className="flex gap-2">
        <label className={btn}>
          <span aria-hidden>📷</span> Sacar foto
          <input type="file" accept="image/*" capture="environment" onChange={pick} className="sr-only" />
        </label>
        <label className={btn}>
          <span aria-hidden>📁</span> {allowPdf ? "Elegir archivo" : "Elegir de galería"}
          <input type="file" accept={accept} onChange={pick} className="sr-only" />
        </label>
      </div>

      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}

      {value && (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2">
          {preview && value.type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa" className="h-20 w-20 rounded object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded bg-red-50 text-xs font-semibold text-red-700">PDF</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-gray-800">{value.name}</p>
            <p className="text-xs text-gray-500">
              {(value.size / 1024 / 1024).toFixed(1)} MB{value.type.startsWith("image/") && " · se comprime al subir"}
            </p>
          </div>
          <button type="button" onClick={() => onChange(null)} className="px-2 text-sm text-gray-500 hover:text-red-600">Quitar</button>
        </div>
      )}
    </div>
  );
}
