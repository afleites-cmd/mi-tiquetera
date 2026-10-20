import { compressImage } from "./image-client";

/** Sube un archivo a /api/upload (comprimiendo imágenes) y devuelve su URL pública. */
export async function uploadFile(file: File): Promise<string> {
  const toSend = await compressImage(file);
  const fd = new FormData();
  fd.append("file", toSend);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "No se pudo subir el archivo.");
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}
