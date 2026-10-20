// POST /api/users/[id]/reset-password — genera una contraseña provisoria (Gerente)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, assertCan } from "@/lib/tickets";
import { generarProvisoria, hashPassword } from "@/lib/passwords";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;

  try {
    assertCan(user, "ADMINISTRAR_USUARIOS");
    const provisoria = generarProvisoria();
    const target = await prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(provisoria), mustChangePassword: true },
      select: { email: true, name: true },
    });
    return NextResponse.json({ ...target, provisoria });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[users/reset]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
