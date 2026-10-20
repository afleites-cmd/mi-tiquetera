import type { Permission, Role } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

/**
 * Usuario autenticado de la request, tomado de la sesión (nunca del body).
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: Permission[];
  active: boolean;
  mustChangePassword: boolean;
}

/**
 * Lee el usuario de la base en cada request (una consulta chica): así un cambio de
 * permisos, rol o desactivación hecho por el Gerente aplica de inmediato, sin re-login.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const u = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, permissions: true, active: true, mustChangePassword: true },
  });
  return u ?? null;
}

export class ForbiddenError extends Error {
  status = 403;
}
export class UnauthorizedError extends Error {
  status = 401;
}

/**
 * Para páginas (Server Components): redirige al login si no hay sesión y a /tickets
 * si el rol no corresponde.
 */
export async function requirePermission(perm: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user, perm)) redirect("/tickets?denied=1");
  return user;
}

/** Igual que requireRole pero sólo exige sesión. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
