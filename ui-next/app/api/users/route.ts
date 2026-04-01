import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { UserCreateSchema } from "@/lib/validations/user";
import { hashWithSecret } from "@/lib/crypto";
import { desc, eq } from "drizzle-orm";
import { jsonError, requireApiUser } from "@/lib/api-utils";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  if (!user?.sa) return jsonError("Forbidden", 403);

  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  return NextResponse.json(
    rows.map((u) => ({
      id: u.id,
      first_name: u.firstName,
      last_name: u.lastName,
      email: u.email,
      language: u.language,
      isinactive: u.isInactive,
      sa: u.sa,
      isdisabled: u.isDisabled,
    })),
  );
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  if (!user?.sa) return jsonError("Forbidden", 403);

  const body = await request.json();
  const parsed = UserCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return jsonError("AUTH_SECRET is missing", 500);

  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email.toLowerCase()),
  });
  if (existing) return jsonError("User already exists", 409);

  await db.insert(users).values({
    id: randomUUID(),
    firstName: parsed.data.first_name,
    lastName: parsed.data.last_name,
    email: parsed.data.email.toLowerCase(),
    language: parsed.data.language,
    passwordHash: hashWithSecret(parsed.data.password, secret),
    tokenHash: parsed.data.token ? hashWithSecret(parsed.data.token, secret) : "",
    sa: parsed.data.sa,
    isDisabled: parsed.data.isdisabled,
    isInactive: false,
    isRemoved: false,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
