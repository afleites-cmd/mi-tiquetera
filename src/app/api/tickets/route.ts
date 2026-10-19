// POST /api/tickets — alta de ticket (Solicitante o Mantenimiento).
import { NextResponse } from "next/server";
import { z } from "zod";
import { Priority } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { HttpError, assertRole } from "@/lib/tickets";

const schema = z.object({
  locationId: z.string().uuid(),
  floor: z.string().trim().min(1).max(50),
  specificPlace: z.string().trim().min(1).max(100),
  description: z.string().trim().min(5).max(2000),
  priority: z.nativeEnum(Priority).default("VERDE"),
  photoUrl: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    assertRole(user, ["SOLICITANTE", "MANTENIMIENTO"]);
    const ticket = await prisma.$transaction(async (tx) => {
      const t = await tx.ticket.create({ data: { ...parsed.data, createdById: user.id } });
      await tx.statusHistory.create({
        data: { ticketId: t.id, fromStatus: null, toStatus: "NUEVO", userId: user.id, comment: "Ticket creado" },
      });
      return t;
    });
    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[tickets]", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
