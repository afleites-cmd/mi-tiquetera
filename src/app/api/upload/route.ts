import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/upload  (multipart/form-data, campo "file")
 * Guarda el archivo y devuelve { url }. El frontend sube primero el adjunto y luego
 * manda la URL al endpoint de transición.
 *
 * Implementación local (public/uploads). Para producción reemplazar el cuerpo por
 * Supabase Storage / S3 manteniendo el contrato { url }.
 */
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Sólo PDF, JPG o PNG" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Archivo mayor a 25 MB" }, { status: 413 });
  }

  const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".bin");
  const name = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${name}` });
}
