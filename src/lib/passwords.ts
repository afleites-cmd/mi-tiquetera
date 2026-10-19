import { hash } from "bcryptjs";

/** Contraseña provisoria legible: 4 letras + 4 números (ej. "KRTM-4821"). */
export function generarProvisoria(): string {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I/O para no confundir con 1/0
  let l = "";
  for (let i = 0; i < 4; i++) l += letras[Math.floor(Math.random() * letras.length)];
  const n = String(Math.floor(1000 + Math.random() * 9000));
  return `${l}-${n}`;
}

export const MIN_PASSWORD = 8;

export function hashPassword(p: string) {
  return hash(p, 10);
}
