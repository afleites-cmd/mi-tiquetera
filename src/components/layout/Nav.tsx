import Link from "next/link";
import type { Role } from "@/generated/prisma/client";
import { signOut } from "@/auth";

const ROLE_LABEL: Record<Role, string> = {
  SOLICITANTE: "Solicitante",
  MANTENIMIENTO: "Mantenimiento",
  GERENTE: "Gerente",
  TESORERIA: "Tesorería",
};

export function Nav({ user }: { user: { name: string; role: Role } }) {
  const links = [
    { href: "/tickets", label: "Tickets" },
    ...(user.role === "SOLICITANTE" || user.role === "MANTENIMIENTO"
      ? [{ href: "/tickets/nuevo", label: "Nuevo ticket" }]
      : []),
    ...(user.role === "TESORERIA" || user.role === "GERENTE"
      ? [{ href: "/dashboard/tesoreria", label: "Tesorería" }]
      : []),
  ];

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <nav className="flex items-center gap-5">
          <Link href="/tickets" className="font-bold text-gray-900">Tiquetera</Link>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-gray-600 hover:text-gray-900">{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600">
            {user.name} · <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium">{ROLE_LABEL[user.role]}</span>
          </span>
          <form action={logout}>
            <button className="text-gray-500 hover:text-gray-900">Salir</button>
          </form>
        </div>
      </div>
    </header>
  );
}
