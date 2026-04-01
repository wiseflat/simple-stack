import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashWithSecret } from "@/lib/crypto";
import { UserUpdateSchema } from "@/lib/validations/user";
import { jsonError, requireApiUser } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  if (!user?.sa) return jsonError("Forbidden", 403);

  const { id } = await params;
  const row = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!row) return jsonError("Not found", 404);

  return NextResponse.json({
    id: row.id,
    first_name: row.firstName,
    last_name: row.lastName,
    email: row.email,
    language: row.language,
    isinactive: row.isInactive,
    sa: row.sa,
    isdisabled: row.isDisabled,
  });
}

export async function PUT(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  if (!user?.sa) return jsonError("Forbidden", 403);

  const { id } = await params;
  const body = await request.json();
  const parsed = UserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!existing) return jsonError("Not found", 404);

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return jsonError("AUTH_SECRET is missing", 500);

  await db
    .update(users)
    .set({
      firstName: parsed.data.first_name,
      lastName: parsed.data.last_name,
      email: parsed.data.email.toLowerCase(),
      language: parsed.data.language ?? existing.language,
      passwordHash: parsed.data.password
        ? hashWithSecret(parsed.data.password, secret)
        : existing.passwordHash,
      tokenHash: parsed.data.token
        ? hashWithSecret(parsed.data.token, secret)
        : existing.tokenHash,
      sa: parsed.data.sa ?? existing.sa,
      isDisabled: parsed.data.isdisabled ?? existing.isDisabled,
      isInactive: parsed.data.isinactive ?? existing.isInactive,
      notifications: parsed.data.notifications ?? existing.notifications,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, id), eq(users.isRemoved, false)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;
  if (!user?.sa) return jsonError("Forbidden", 403);

  const { id } = await params;
  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
