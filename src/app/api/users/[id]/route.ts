// PATCH /api/users/[id] — nombre, rol (resetea permisos a los del rol), permisos, activo
import { NextResponse } from "next/server";
import { z } from "zod";
import { Permission, Role } from "@/generated/prisma/client";
import { ROLE_DEFAULTS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, assertCan } from "@/lib/tickets";

const schema = z.object({
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional(),
  name: z.string().trim().min(2).max(100).optional(),
  permissions: z.array(z.nativeEnum(Permission)).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    assertCan(user, "ADMINISTRAR_USUARIOS");
    const d = parsed.data;
    if (id === user.id) {
      const pierdeAdmin = d.permissions && !d.permissions.includes("ADMINISTRAR_USUARIOS");
      const cambiaRol = d.role && d.role !== "GERENTE";
      if (d.active === false || pierdeAdmin || cambiaRol) {
        throw new HttpError(409, "No podés desactivarte ni quitarte la administración de usuarios a vos mismo");
      }
    }
    // Cambiar el rol vuelve los permisos a los del rol nuevo (salvo que se manden explícitos).
    const data = { ...d, ...(d.role && !d.permissions ? { permissions: ROLE_DEFAULTS[d.role] } : {}) };
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, permissions: true, active: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[users/id]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
