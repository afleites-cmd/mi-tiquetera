// Compresión de imágenes en el navegador antes de subirlas.
// Las fotos de celular pesan 5–10 MB; se reducen a máx. 1600 px de lado y JPEG 0.82
// (~200–400 KB), suficiente para ver el problema o leer una factura.

const MAX_SIDE = 1600;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 600 * 1024) { bitmap.close(); return file; }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", QUALITY));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file; // si el navegador no puede decodificarla, se sube tal cual
  }
}
