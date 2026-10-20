import { requireUser } from "@/lib/auth";
import { CambiarPassword } from "@/components/cuenta/CambiarPassword";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const me = await requireUser();
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Mi cuenta</h1>
        <p className="text-sm text-gray-500">{me.name} · {me.email}</p>
      </div>
      <CambiarPassword forzado={me.mustChangePassword} />
    </main>
  );
}
