import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { jsonError, requireApiUser } from "@/lib/api-utils";
import { UserProfileUpdateSchema } from "@/lib/validations/user";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const row = await db.query.users.findFirst({ where: eq(users.id, user!.id) });
  if (!row) return jsonError("Not found", 404);

  return NextResponse.json({
    first_name: row.firstName,
    last_name: row.lastName,
    email: row.email,
    language: row.language,
  });
}

export async function PUT(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const body = await request.json();
  const parsed = UserProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  await db
    .update(users)
    .set({
      firstName: parsed.data.first_name,
      lastName: parsed.data.last_name,
      email: parsed.data.email.toLowerCase(),
      language: parsed.data.language,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user!.id));

  return NextResponse.json({ ok: true });
}
