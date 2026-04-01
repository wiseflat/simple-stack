import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashWithSecret } from "@/lib/crypto";
import { LoginSchema } from "@/lib/validations/user";
import { jsonError } from "@/lib/api-utils";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const allUsers = await db.select({ id: users.id }).from(users);
  if (allUsers.length > 0) {
    return jsonError("Registration is disabled, please try later", 403);
  }

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return jsonError("AUTH_SECRET is missing", 500);

  await db.insert(users).values({
    id: randomUUID(),
    firstName: "First",
    lastName: "Admin",
    email: parsed.data.email.toLowerCase(),
    passwordHash: hashWithSecret(parsed.data.password, secret),
    language: "en",
    tokenHash: "",
    sa: true,
    isDisabled: false,
    isInactive: false,
    isRemoved: false,
    createdAt: new Date(),
  });

  return NextResponse.json(
    { error: "The first account has been create, try to log in now" },
    { status: 201 },
  );
}
