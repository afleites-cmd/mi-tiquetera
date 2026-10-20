import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/upload  (multipart/form-data, campo "file")
 * Guarda el archivo y devuelve { url }.
 *
 * - En Vercel (hay BLOB_READ_WRITE_TOKEN): Vercel Blob, almacenamiento persistente.
 *   La URL es pública pero con un sufijo aleatorio imposible de adivinar.
 * - En local (sin token): public/uploads/ en disco.
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

  const ext = path.extname(file.name).toLowerCase() || { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" }[file.type]!;
  const name = `${randomUUID()}${ext}`;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`adjuntos/${name}`, file, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    }

    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: `/uploads/${name}` });
  } catch (err) {
    console.error("[upload]", err);
    const enVercel = !!process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN;
    return NextResponse.json(
      {
        error: enVercel
          ? "El almacenamiento de archivos no está configurado (falta conectar Vercel Blob)."
          : "No se pudo guardar el archivo.",
      },
      { status: 500 },
    );
  }
}
