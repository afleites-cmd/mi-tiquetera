import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: (formData.get("callbackUrl") as string) || "/tickets",
      });
    } catch (err) {
      if (err instanceof AuthError) redirect("/login?error=1");
      throw err; // el redirect de Auth.js también se lanza como excepción
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tiquetera de Mantenimiento</h1>
          <p className="text-sm text-gray-500">Ingresá con tu usuario.</p>
        </div>
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Email</span>
          <input name="email" type="email" required autoComplete="email" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Contraseña</span>
          <input name="password" type="password" required autoComplete="current-password" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Email o contraseña incorrectos.</p>}
        <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Ingresar
        </button>
      </form>
    </main>
  );
}
