// ENTREGABLE 1: Máquina de Estados / Lógica de Transiciones
// Única fuente de verdad para: transiciones permitidas por rol, condiciones de pago,
// cálculo de vencimientos y umbral de alerta de Tesorería. La usan el backend y el frontend.

import { PaymentCondition, Priority, QuoteStatus, Role, TicketStatus } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Semáforo de urgencia
// ---------------------------------------------------------------------------

export const PRIORITIES: Record<
  Priority,
  { label: string; description: string; order: number; badge: string; dot: string }
> = {
  ROJO: {
    label: "Emergencia",
    description: "Riesgo de seguridad, sin servicio o daño en curso. Atención inmediata.",
    order: 0,
    badge: "bg-red-100 text-red-700 ring-1 ring-red-300",
    dot: "bg-red-500",
  },
  AMARILLO: {
    label: "Urgente",
    description: "Afecta la operación. Atender en pocos días.",
    order: 1,
    badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
    dot: "bg-amber-400",
  },
  VERDE: {
    label: "Normal",
    description: "Puede esperar; se programa.",
    order: 2,
    badge: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
    dot: "bg-emerald-500",
  },
};

/** Roles que pueden cambiar la prioridad después de creado el ticket. */
export const PRIORITY_EDITOR_ROLES: Role[] = [Role.MANTENIMIENTO, Role.GERENTE];

/** Comparador para ordenar listas: ROJO primero, luego por antigüedad. */
export function byPriorityThenAge<T extends { priority: Priority; createdAt: Date }>(a: T, b: T) {
  const d = PRIORITIES[a.priority].order - PRIORITIES[b.priority].order;
  return d !== 0 ? d : a.createdAt.getTime() - b.createdAt.getTime();
}

// ---------------------------------------------------------------------------
// Transiciones
// ---------------------------------------------------------------------------

export const ALLOWED_TRANSITIONS: Record<
  TicketStatus,
  { next: TicketStatus[]; roles: Role[] }
> = {
  NUEVO: {
    next: [TicketStatus.EN_PRESUPUESTACION],
    roles: [Role.MANTENIMIENTO],
  },
  EN_PRESUPUESTACION: {
    next: [TicketStatus.PENDIENTE_APROBACION],
    roles: [Role.MANTENIMIENTO],
  },
  PENDIENTE_APROBACION: {
    next: [TicketStatus.AUTORIZADO, TicketStatus.RECHAZADO],
    roles: [Role.GERENTE],
  },
  AUTORIZADO: {
    next: [TicketStatus.PENDIENTE_PAGO],
    roles: [Role.MANTENIMIENTO],
  },
  PENDIENTE_PAGO: {
    next: [TicketStatus.FINALIZADO],
    roles: [Role.TESORERIA],
  },
  FINALIZADO: { next: [], roles: [] },
  /// RECHAZADO: el Gerente rechazó y no quedan presupuestos que completen la cobertura.
  /// Mantenimiento debe cargar otro(s); al cargar uno el ticket vuelve a EN_PRESUPUESTACION.
  RECHAZADO: {
    next: [TicketStatus.EN_PRESUPUESTACION],
    roles: [Role.MANTENIMIENTO],
  },
};

// ---------------------------------------------------------------------------
// Cobertura de presupuestos (mano de obra / materiales)
// ---------------------------------------------------------------------------

export interface QuoteLike {
  status: QuoteStatus;
  coversLabor: boolean;
  coversMaterials: boolean;
}

export interface QuoteCoverage {
  laborApproved: boolean;
  materialsApproved: boolean;
  /** Ambos rubros cubiertos por presupuestos aprobados → el ticket puede autorizarse. */
  complete: boolean;
  /** Hay presupuestos aún sin revisar que podrían completar lo que falta. */
  pendingCanComplete: boolean;
}

export function quoteCoverage(quotes: QuoteLike[]): QuoteCoverage {
  const approved = quotes.filter((q) => q.status === "APROBADO");
  const pending = quotes.filter((q) => q.status === "PENDIENTE");

  const laborApproved = approved.some((q) => q.coversLabor);
  const materialsApproved = approved.some((q) => q.coversMaterials);

  const laborPending = laborApproved || pending.some((q) => q.coversLabor);
  const materialsPending = materialsApproved || pending.some((q) => q.coversMaterials);

  return {
    laborApproved,
    materialsApproved,
    complete: laborApproved && materialsApproved,
    pendingCanComplete: laborPending && materialsPending,
  };
}

/**
 * Estado del ticket luego de que el Gerente revisa un presupuesto:
 *  - cobertura completa                 → AUTORIZADO
 *  - los pendientes aún pueden completar → sigue PENDIENTE_APROBACION
 *  - no hay forma de completar           → RECHAZADO (Mantenimiento carga otro)
 */
export function statusAfterReview(quotes: QuoteLike[]): TicketStatus {
  const c = quoteCoverage(quotes);
  if (c.complete) return TicketStatus.AUTORIZADO;
  if (c.pendingCanComplete) return TicketStatus.PENDIENTE_APROBACION;
  return TicketStatus.RECHAZADO;
}

/** Estados en los que Mantenimiento puede cargar presupuestos. */
export const QUOTE_LOADABLE_STATUSES: TicketStatus[] = [
  TicketStatus.NUEVO,
  TicketStatus.EN_PRESUPUESTACION,
  TicketStatus.RECHAZADO,
];

export function validateTransition(
  currentStatus: TicketStatus,
  targetStatus: TicketStatus,
  userRole: Role,
): boolean {
  const t = ALLOWED_TRANSITIONS[currentStatus];
  if (!t) return false;
  return t.next.includes(targetStatus) && t.roles.includes(userRole);
}

/** Transiciones disponibles para un rol desde un estado (para armar botones en la UI). */
export function nextStatusesFor(
  currentStatus: TicketStatus,
  userRole: Role,
): TicketStatus[] {
  const t = ALLOWED_TRANSITIONS[currentStatus];
  return t && t.roles.includes(userRole) ? t.next : [];
}

// ---------------------------------------------------------------------------
// Condiciones de pago y vencimientos
// ---------------------------------------------------------------------------

export const PAYMENT_CONDITIONS: Record<
  PaymentCondition,
  { label: string; days: number; description: string }
> = {
  INMEDIATO: { label: "Inmediato", days: 0, description: "Se paga el mismo día" },
  CUENTA_CORRIENTE: {
    label: "Cuenta Corriente",
    days: 30,
    description: "Regla base: liquidación a 30 días",
  },
  SEMANAL: { label: "Semanal", days: 7, description: "Vence a los 7 días" },
  DIAS_30: { label: "30 días", days: 30, description: "Vence a los 30 días" },
  DIAS_60: { label: "60 días", days: 60, description: "Vence a los 60 días" },
};

/** Cálculo automático de vencimiento según condición comercial. No muta issueDate. */
export function calculateDueDate(issueDate: Date, condition: PaymentCondition): Date {
  const due = new Date(issueDate);
  due.setDate(due.getDate() + PAYMENT_CONDITIONS[condition].days);
  return due;
}

/** Días enteros entre hoy y el vencimiento (negativo = vencida). */
export function daysUntilDue(dueDate: Date, today = new Date()): number {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(dueDate) - utc(today)) / 86_400_000);
}

/** Facturas que vencen en <= 5 días (o ya vencidas) disparan alerta en Tesorería. */
export const DUE_ALERT_DAYS = 5;
