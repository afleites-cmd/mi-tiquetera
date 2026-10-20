// GET  /api/users — lista de usuarios (Gerente)
// POST /api/users — alta de usuario con contraseña provisoria (Gerente)
import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, assertCan } from "@/lib/tickets";
import { generarProvisoria, hashPassword } from "@/lib/passwords";
import { ROLE_DEFAULTS } from "@/lib/permissions";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  role: z.nativeEnum(Role),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  try {
    assertCan(user, "ADMINISTRAR_USUARIOS");
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, permissions: true, active: true, mustChangePassword: true, createdAt: true },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
    return NextResponse.json(users);
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });

  try {
    assertCan(user, "ADMINISTRAR_USUARIOS");
    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (exists) throw new HttpError(409, "Ya existe un usuario con ese email");

    const provisoria = generarProvisoria();
    const created = await prisma.user.create({
      data: { ...parsed.data, permissions: ROLE_DEFAULTS[parsed.data.role], passwordHash: await hashPassword(provisoria), mustChangePassword: true },
      select: { id: true, name: true, email: true, role: true },
    });
    // La provisoria se devuelve una sola vez, para que el Gerente se la pase al usuario.
    return NextResponse.json({ ...created, provisoria }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[users]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
