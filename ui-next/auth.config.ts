import type { NextAuthConfig } from "next-auth";

const protectedPrefixes = [
  "/dashboard",
  "/infrastructures",
  "/catalogs",
  "/softwares",
  "/users",
  "/api-interne",
  "/settings",
  "/events",
];

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const typed = user as { id?: string; role?: string; sa?: boolean };
        token.uid = typed.id;
        token.role = typed.role ?? "user";
        token.sa = !!typed.sa;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id =
          typeof token.uid === "string" ? token.uid : undefined;
        (session.user as { role?: string }).role =
          typeof token.role === "string" ? token.role : "user";
        (session.user as { sa?: boolean }).sa = !!token.sa;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = protectedPrefixes.some((prefix) =>
        nextUrl.pathname.startsWith(prefix),
      );

      if (isProtected && !isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return Response.redirect(loginUrl);
      }

      return true;
    },
  },
  // Providers are added only in lib/auth.ts (Node.js runtime).
  // This file must remain free of Node.js-only imports for Edge compatibility.
  providers: [],
};
