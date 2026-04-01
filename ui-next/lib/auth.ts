// This file runs in the Node.js runtime only (API routes).
// Never import it from proxy.ts / Edge code.
// Phase 2: replace demo comparison with db.query(users).where(email).check(sha256(password, AUTH_SECRET))
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { hashWithSecret } from "@/lib/crypto";

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? "dev-secret-change-me",
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email);
        const password = String(credentials?.password ?? "");
        const secret = process.env.AUTH_SECRET ?? "";
        if (!email || !password || !secret) {
          return null;
        }

        const hashedPassword = hashWithSecret(password, secret);

        const user = await db.query.users.findFirst({
          where: and(
            eq(users.email, email),
            eq(users.passwordHash, hashedPassword),
            eq(users.isInactive, false),
            eq(users.isRemoved, false),
          ),
        });

        if (!user || user.isDisabled) {
          const activeAdmin = await db.query.users.findFirst({
            where: and(
              eq(users.sa, true),
              eq(users.isInactive, false),
              eq(users.isRemoved, false),
              eq(users.isDisabled, false),
            ),
          });

          // Temporary break-glass account, only when no active admin exists in DB.
          if (!activeAdmin) {
            const tempAdminEmail = normalizeEmail(process.env.TEMP_ADMIN_EMAIL);
            const tempAdminPassword = String(process.env.TEMP_ADMIN_PASSWORD ?? "");

            if (
              tempAdminEmail &&
              tempAdminPassword &&
              email === tempAdminEmail &&
              password === tempAdminPassword
            ) {
              return {
                id: "temp-admin",
                name: "Temporary Administrator",
                email: tempAdminEmail,
                role: "admin",
                sa: true,
              };
            }
          }

          return null;
        }

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          role: user.sa ? "admin" : "user",
          sa: !!user.sa,
        };
      },
    }),
  ],
});
