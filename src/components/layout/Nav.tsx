import Link from "next/link";
import type { Role } from "@/generated/prisma/client";
import { signOut } from "@/auth";
import { can, type HasPermissions } from "@/lib/permissions";

const ROLE_LABEL: Record<Role, string> = {
  SOLICITANTE: "Solicitante",
  MANTENIMIENTO: "Mantenimiento",
  GERENTE: "Gerente",
  TESORERIA: "Tesorería",
};

export function Nav({ user }: { user: { name: string; role: Role } & HasPermissions }) {
  const links = [
    { href: "/tickets", label: "Tickets" },
    ...(can(user, "CREAR_TICKETS") ? [{ href: "/tickets/nuevo", label: "+ Nuevo ticket" }] : []),
    ...(can(user, "VER_TESORERIA") ? [{ href: "/dashboard/tesoreria", label: "Tesorería" }] : []),
    ...(can(user, "ADMINISTRAR_USUARIOS") ? [{ href: "/usuarios", label: "Usuarios" }] : []),
  ];

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6 sm:py-3">
        <Link href="/tickets" className="py-1 font-bold text-gray-900">Tiquetera</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/cuenta" className="max-w-[12rem] truncate py-1 text-gray-600 hover:text-gray-900" title="Mi cuenta">
            {user.name} · <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium">{ROLE_LABEL[user.role]}</span>
          </Link>
          <form action={logout}>
            <button className="py-1 text-gray-500 hover:text-gray-900">Salir</button>
          </form>
        </div>
        <nav className="-mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-auto sm:gap-2 sm:px-0 sm:pb-0">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">{l.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
