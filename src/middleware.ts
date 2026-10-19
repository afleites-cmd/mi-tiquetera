// Protege todo salvo /login y los assets. Redirige a /login si no hay sesión.
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = pathname === "/login" || pathname.startsWith("/api/auth");
  if (!req.auth && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  if (req.auth && pathname === "/login") {
    return NextResponse.redirect(new URL("/tickets", req.nextUrl.origin));
  }
  // El layout lee x-pathname para forzar el cambio de contraseña provisoria.
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: reqHeaders } });
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
