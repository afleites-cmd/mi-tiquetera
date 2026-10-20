// Permisos individuales. El rol fija los tildes iniciales; el Gerente los ajusta por usuario.
import { Permission, Role } from "@/generated/prisma/enums";

export const PERMISSIONS: { key: Permission; label: string; hint: string }[] = [
  { key: "CREAR_TICKETS", label: "Crear tickets", hint: "Reportar problemas de mantenimiento" },
  { key: "CARGAR_PRESUPUESTOS", label: "Cargar presupuestos", hint: "Subir presupuestos y enviarlos a aprobación" },
  { key: "APROBAR_PRESUPUESTOS", label: "Aprobar presupuestos", hint: "Aprobar o rechazar presupuestos" },
  { key: "CARGAR_FACTURAS", label: "Cargar facturas", hint: "Subir la factura de un presupuesto aprobado" },
  { key: "REGISTRAR_PAGOS", label: "Registrar pagos", hint: "Marcar facturas como pagadas con comprobante" },
  { key: "VER_TESORERIA", label: "Ver Tesorería", hint: "Panel de vencimientos y pagos" },
  { key: "CAMBIAR_URGENCIA", label: "Cambiar urgencia", hint: "Modificar el semáforo de un ticket" },
  { key: "VER_TODOS_LOS_TICKETS", label: "Ver todos los tickets", hint: "Si no, sólo ve los que creó" },
  { key: "ADMINISTRAR_USUARIOS", label: "Administrar usuarios", hint: "Crear usuarios, roles, permisos y contraseñas" },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSIONS.map((p) => p.key);

/** Tildes iniciales por rol. */
export const ROLE_DEFAULTS: Record<Role, Permission[]> = {
  SOLICITANTE: ["CREAR_TICKETS"],
  MANTENIMIENTO: ["CREAR_TICKETS", "CARGAR_PRESUPUESTOS", "CARGAR_FACTURAS", "CAMBIAR_URGENCIA", "VER_TODOS_LOS_TICKETS"],
  TESORERIA: ["CREAR_TICKETS", "REGISTRAR_PAGOS", "VER_TESORERIA", "VER_TODOS_LOS_TICKETS"],
  GERENTE: ALL_PERMISSIONS,
};

export interface HasPermissions {
  permissions: Permission[];
}

export function can(user: HasPermissions, perm: Permission): boolean {
  return user.permissions.includes(perm);
}

export function canAny(user: HasPermissions, perms: Permission[]): boolean {
  return perms.some((p) => user.permissions.includes(p));
}
