import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { decrypt, encrypt } from "@/lib/crypto";
import { infrastructures, variables } from "@/lib/db/schema";
import { jsonError, requireApiUser } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const infrastructure = await db.query.infrastructures.findFirst({
    where: and(eq(infrastructures.id, id), eq(infrastructures.uid, user!.id)),
  });
  if (!infrastructure) return jsonError("Not found", 404);

  const row = await db.query.variables.findFirst({
    where: and(
      eq(variables.uid, user!.id),
      eq(variables.key, id),
      eq(variables.type, "tfstate"),
    ),
  });

  if (!row) return NextResponse.json({ version: 4 });

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return jsonError("AUTH_SECRET is missing", 500);

  const decrypted = decrypt(row.value, secret);
  if (decrypted === null) return jsonError("Unable to decrypt tfstate", 500);

  try {
    return NextResponse.json(JSON.parse(decrypted));
  } catch {
    return NextResponse.json({ version: 4 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const body = await request.json();

  const infrastructure = await db.query.infrastructures.findFirst({
    where: and(eq(infrastructures.id, id), eq(infrastructures.uid, user!.id)),
  });
  if (!infrastructure) return jsonError("Not found", 404);

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return jsonError("AUTH_SECRET is missing", 500);

  const encryptedValue = encrypt(JSON.stringify(body ?? {}), secret);

  const existing = await db.query.variables.findFirst({
    where: and(
      eq(variables.uid, user!.id),
      eq(variables.key, id),
      eq(variables.type, "tfstate"),
    ),
  });

  if (existing) {
    await db
      .update(variables)
      .set({
        value: encryptedValue,
        updatedAt: new Date(),
      })
      .where(eq(variables.id, existing.id));

    return NextResponse.json({ ok: true });
  }

  await db.insert(variables).values({
    id: randomUUID(),
    uid: user!.id,
    key: id,
    key2: id,
    type: "tfstate",
    value: encryptedValue,
    updatedAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
