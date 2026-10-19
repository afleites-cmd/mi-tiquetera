// PATCH /api/users/[id] — cambiar rol o activar/desactivar (Gerente)
import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, assertRole } from "@/lib/tickets";

const schema = z.object({
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional(),
  name: z.string().trim().min(2).max(100).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    assertRole(user, ["GERENTE"]);
    if (id === user.id && (parsed.data.active === false || (parsed.data.role && parsed.data.role !== "GERENTE"))) {
      throw new HttpError(409, "No podés desactivarte ni quitarte el rol de Gerente a vos mismo");
    }
    const updated = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[users/id]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
