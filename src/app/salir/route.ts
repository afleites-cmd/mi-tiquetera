// GET /salir?motivo=inactivo — cierra la sesión desde el servidor (usuario desactivado).
import { signOut } from "@/auth";

export async function GET(req: Request) {
  const motivo = new URL(req.url).searchParams.get("motivo");
  await signOut({ redirectTo: motivo ? `/login?error=${motivo}` : "/login" });
}
