"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import type { Permission, Role } from "@/generated/prisma/enums";
import { PERMISSIONS, ROLE_DEFAULTS } from "@/lib/permissions";

export interface UsuarioRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  active: boolean;
  mustChangePassword: boolean;
}

const ROLES: { value: Role; label: string }[] = [
  { value: "SOLICITANTE", label: "Solicitante" },
  { value: "MANTENIMIENTO", label: "Mantenimiento" },
  { value: "GERENTE", label: "Gerente" },
  { value: "TESORERIA", label: "Tesorería" },
];
const roleLabel = (r: Role) => ROLES.find((x) => x.value === r)?.label ?? r;

const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

export function PanelUsuarios({ usuarios, meId }: { usuarios: UsuarioRow[]; meId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("SOLICITANTE");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provisoria, setProvisoria] = useState<{ email: string; name: string; provisoria: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [permsOpen, setPermsOpen] = useState<string | null>(null);

  async function call(path: string, init: RequestInit) {
    const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json" } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Error");
    return body;
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("crear");
    try {
      const r = await call("/api/users", { method: "POST", body: JSON.stringify({ name, email, role }) });
      setProvisoria(r);
      setName(""); setEmail(""); setRole("SOLICITANTE");
      router.refresh();
    } catch (err) { setError((err as Error).message); } finally { setBusy(null); }
  }

  async function patch(id: string, data: Partial<UsuarioRow>) {
    setError(null);
    setBusy(id);
    try { await call(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }); router.refresh(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(null); }
  }

  async function togglePerm(u: UsuarioRow, perm: Permission) {
    const has = u.permissions.includes(perm);
    const permissions = has ? u.permissions.filter((p) => p !== perm) : [...u.permissions, perm];
    await patch(u.id, { permissions });
  }

  async function changeRole(u: UsuarioRow, role: Role) {
    const ok = window.confirm(
      `Cambiar el rol a ${roleLabel(role)} reemplaza los permisos del usuario por los de ese rol. ¿Continuar?`,
    );
    if (ok) await patch(u.id, { role });
  }

  async function saveName() {
    if (!editing) return;
    const name = editing.name.trim();
    if (name.length < 2) return setError("El nombre debe tener al menos 2 caracteres.");
    await patch(editing.id, { name });
    setEditing(null);
  }

  async function reset(u: UsuarioRow) {
    if (!window.confirm(`¿Generar una contraseña nueva para ${u.name}? La actual dejará de funcionar.`)) return;
    setError(null);
    setBusy(u.id);
    try { setProvisoria(await call(`/api/users/${u.id}/reset-password`, { method: "POST" })); router.refresh(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      {provisoria && (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-900">Contraseña provisoria para {provisoria.name}</p>
          <p className="mt-1 text-sm text-emerald-800">
            Pasale estos datos. Al ingresar, el sistema le va a pedir que elija una contraseña propia.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-white px-3 py-2 text-sm"><span className="text-gray-500">Email: </span><span className="font-mono">{provisoria.email}</span></div>
            <div className="rounded-lg bg-white px-3 py-2 text-sm"><span className="text-gray-500">Contraseña: </span><span className="font-mono text-lg font-bold tracking-wider">{provisoria.provisoria}</span></div>
          </div>
          <p className="mt-2 text-xs text-emerald-700">Esta contraseña se muestra una sola vez. Si la perdés, generá otra con "Nueva contraseña".</p>
          <button onClick={() => setProvisoria(null)} className="mt-3 text-sm text-emerald-800 underline">Cerrar</button>
        </div>
      )}

      <form onSubmit={crear} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Nuevo usuario</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input required placeholder="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          <input required type="email" placeholder="email@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={input}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button type="submit" disabled={busy === "crear"} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy === "crear" ? "Creando…" : "Crear usuario"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Se genera una contraseña provisoria automáticamente.</p>
      </form>

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-xs font-semibold uppercase text-gray-600">
            <tr>
              <th className="p-3">Nombre</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map((u) => {
              const me = u.id === meId;
              return (
                <Fragment key={u.id}>
                <tr className={u.active ? "" : "opacity-50"}>
                  <td className="p-3 font-medium">
                    {editing?.id === u.id ? (
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing({ id: u.id, name: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditing(null); }}
                        onBlur={saveName}
                        className="w-full rounded-md border border-blue-400 px-2 py-1 text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing({ id: u.id, name: u.name })}
                        title="Clic para editar el nombre"
                        className="rounded px-1 text-left hover:bg-gray-100"
                      >
                        {u.name}
                        {me && <span className="ml-2 text-xs text-gray-400">(vos)</span>}
                      </button>
                    )}
                  </td>
                  <td className="p-3 text-gray-600">{u.email}</td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      disabled={me || busy === u.id}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-50"
                    >
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    {u.active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Activo</span>
                              : <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">Inactivo</span>}
                    {u.mustChangePassword && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700" title="Tiene contraseña provisoria">Provisoria</span>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setPermsOpen(permsOpen === u.id ? null : u.id)} className={`rounded-lg border px-3 py-1 text-xs hover:bg-gray-50 ${permsOpen === u.id ? "bg-gray-100" : ""}`}>
                        Permisos ({u.permissions.length}/{PERMISSIONS.length})
                      </button>
                      <button onClick={() => reset(u)} disabled={busy === u.id} className="rounded-lg border px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50">Nueva contraseña</button>
                      {!me && (
                        <button onClick={() => patch(u.id, { active: !u.active })} disabled={busy === u.id} className={`rounded-lg px-3 py-1 text-xs disabled:opacity-50 ${u.active ? "border border-red-300 text-red-700 hover:bg-red-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                          {u.active ? "Desactivar" : "Reactivar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {permsOpen === u.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-4 pb-4 pt-2">
                      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <span className="font-semibold uppercase tracking-wide">Permisos de {u.name}</span>
                        <button onClick={() => patch(u.id, { permissions: ROLE_DEFAULTS[u.role] })} disabled={busy === u.id} className="underline hover:text-gray-900 disabled:opacity-50">
                          Restablecer a los de {roleLabel(u.role)}
                        </button>
                        <button onClick={() => patch(u.id, { permissions: PERMISSIONS.map((p) => p.key) })} disabled={busy === u.id} className="underline hover:text-gray-900 disabled:opacity-50">
                          Tildar todos
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {PERMISSIONS.map((p) => {
                          const checked = u.permissions.includes(p.key);
                          const lockSelf = me && p.key === "ADMINISTRAR_USUARIOS";
                          return (
                            <label key={p.key} className={`flex cursor-pointer items-start gap-2 rounded-lg border bg-white px-3 py-2 ${checked ? "border-blue-300" : "border-gray-200"} ${lockSelf ? "opacity-60" : ""}`}>
                              <input type="checkbox" checked={checked} disabled={busy === u.id || lockSelf} onChange={() => togglePerm(u, p.key)} className="mt-0.5 h-4 w-4 accent-blue-600" />
                              <span>
                                <span className="block text-sm font-medium text-gray-900">{p.label}</span>
                                <span className="block text-xs text-gray-500">{p.hint}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Hacé clic sobre un nombre para editarlo. El rol define los permisos iniciales; con "Permisos" podés tildar o destildar lo que cada persona puede hacer. Un usuario inactivo no puede ingresar pero conserva su historial.</p>
    </div>
  );
}
