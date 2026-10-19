// Configuración de Auth.js sin dependencias de Node (Prisma, bcrypt) para que el
// middleware pueda correr en el Edge runtime. auth.ts la extiende con el provider.
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as never;
      return session;
    },
  },
} satisfies NextAuthConfig;
