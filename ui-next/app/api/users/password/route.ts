import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, requireApiUser } from "@/lib/api-utils";
import { PasswordUpdateSchema } from "@/lib/validations/user";
import { hashWithSecret } from "@/lib/crypto";

export async function PUT(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const body = await request.json();
  const parsed = PasswordUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return jsonError("AUTH_SECRET is missing", 500);

  await db
    .update(users)
    .set({
      passwordHash: hashWithSecret(parsed.data.password, secret),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user!.id));

  return NextResponse.json({ ok: true });
}
