"use client";

import type { Priority } from "@/generated/prisma/enums";
import { PRIORITIES } from "@/lib/workflow";

const ORDERED: Priority[] = ["ROJO", "AMARILLO", "VERDE"];

/** Badge compacto para listas y cabeceras de ticket. */
export function SemaforoBadge({ priority, size = "sm" }: { priority: Priority; size?: "sm" | "lg" }) {
  const p = PRIORITIES[priority];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${p.badge} ${
        size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
      title={p.description}
    >
      <span className={`h-2 w-2 rounded-full ${p.dot} ${priority === "ROJO" ? "animate-pulse" : ""}`} />
      {p.label}
    </span>
  );
}

/**
 * Selector tipo semáforo: tres botones con color y descripción.
 * Se usa en el alta del ticket (Solicitante) y en el detalle (Mantenimiento/Gerente).
 */
export function SemaforoSelector({
  value,
  onChange,
  disabled,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Urgencia" className="grid gap-2 sm:grid-cols-3">
      {ORDERED.map((key) => {
        const p = PRIORITIES[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
              active ? "border-gray-900 bg-gray-50 shadow-sm" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className={`mt-1 h-4 w-4 shrink-0 rounded-full ${p.dot} ${active ? "ring-4 ring-offset-1 ring-gray-200" : ""}`} />
            <span>
              <span className="block text-sm font-semibold text-gray-900">{p.label}</span>
              <span className="block text-xs text-gray-500">{p.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
