import { del } from "@vercel/blob";
import { unlink } from "node:fs/promises";
import path from "node:path";

/** Borra un adjunto (Vercel Blob o disco local). Nunca falla: si no puede, lo deja. */
export async function deleteAttachment(url: string | null | undefined) {
  if (!url) return;
  try {
    if (url.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", url));
    } else if (process.env.BLOB_READ_WRITE_TOKEN && url.includes("blob.vercel-storage.com")) {
      await del(url);
    }
  } catch (e) {
    console.warn("[blob] no se pudo borrar", url, e);
  }
}
