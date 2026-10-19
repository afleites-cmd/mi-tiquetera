// POST /api/account/password — el usuario cambia su propia contraseña
import { NextResponse } from "next/server";
import { z } from "zod";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { MIN_PASSWORD, hashPassword } from "@/lib/passwords";

const schema = z.object({
  current: z.string().min(1),
  next: z.string().min(MIN_PASSWORD, `Mínimo ${MIN_PASSWORD} caracteres`),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { current, next } = parsed.data;
  if (current === next) return NextResponse.json({ error: "La nueva contraseña debe ser distinta" }, { status: 400 });

  const db = await prisma.user.findUnique({ where: { id: user.id } });
  if (!db || !(await compare(current, db.passwordHash))) {
    return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  return NextResponse.json({ ok: true });
}
