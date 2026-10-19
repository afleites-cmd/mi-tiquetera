import type { Role } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Usuario autenticado de la request, tomado de la sesión (nunca del body).
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.email) return null;
  return { id: u.id, email: u.email, name: u.name ?? u.email, role: u.role };
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
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/tickets?denied=1");
  return user;
}

/** Igual que requireRole pero sólo exige sesión. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
