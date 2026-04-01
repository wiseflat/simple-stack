import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { hashWithSecret } from "@/lib/crypto";

export type SessionUser = {
  id: string;
  email: string;
  role?: string;
  sa?: boolean;
};

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email || !(session.user as { id?: string }).id) {
    return null;
  }

  return {
    id: (session.user as { id: string }).id,
    email: session.user.email,
    role: (session.user as { role?: string }).role,
    sa: !!(session.user as { sa?: boolean }).sa,
  };
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) return { user: null, response: jsonError("Unauthorized", 401) };
  return { user, response: null };
}

export async function requireAdmin() {
  const { user, response } = await requireUser();
  if (response) return { user: null, response };
  if (!user?.sa && user?.role !== "admin") {
    return { user: null, response: jsonError("Forbidden", 403) };
  }
  return { user, response: null };
}

export async function authenticateApiRequest(request: Request): Promise<SessionUser | null> {
  const authHeader = request.headers.get("authorization") ?? "";

  if (authHeader.toLowerCase().startsWith("basic ")) {
    const encoded = authHeader.slice(6).trim();
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (sep <= 0) return null;

    const email = decoded.slice(0, sep).trim().toLowerCase();
    const password = decoded.slice(sep + 1);
    const secret = process.env.AUTH_SECRET ?? "";
    if (!email || !password || !secret) return null;

    const user = await db.query.users.findFirst({
      where: and(
        eq(users.email, email),
        eq(users.passwordHash, hashWithSecret(password, secret)),
        eq(users.isInactive, false),
        eq(users.isRemoved, false),
      ),
    });

    if (!user || user.isDisabled) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.sa ? "admin" : "user",
      sa: !!user.sa,
    };
  }

  return getSessionUser();
}

export async function requireApiUser(request: Request) {
  const user = await authenticateApiRequest(request);
  if (!user) return { user: null, response: jsonError("Unauthorized", 401) };
  return { user, response: null };
}

export function safeJsonParse<T = unknown>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
