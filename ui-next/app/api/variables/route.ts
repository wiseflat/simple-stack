import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import YAML from "yaml";
import { db } from "@/lib/db/client";
import { variables } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";
import { VariableCreateSchema } from "@/lib/validations/variable";
import { jsonError, requireApiUser } from "@/lib/api-utils";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const key = url.searchParams.get("key");
  const key2 = url.searchParams.get("key2");
  const filters = [eq(variables.uid, user!.id)];

  if (type) filters.push(eq(variables.type, type));
  if (key) filters.push(eq(variables.key, key));

  const rows = await db
    .select()
    .from(variables)
    .where(filters.length === 1 ? filters[0] : and(...filters))
    .orderBy(asc(variables.type), asc(variables.key));

  if (type && key && key2 !== null) {
    const exact = rows.filter((row) => (row.key2 ?? "") === key2);
    if (exact.length) return NextResponse.json(exact);

    // Temporary fallback while legacy rows still miss node-specific key2 values.
    const legacy = rows.filter((row) => !row.key2 || row.key2 === row.key);
    return NextResponse.json(legacy);
  }

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const body = await request.json();
  const parsed = VariableCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return jsonError("AUTH_SECRET is missing", 500);

  const yamlObj = parsed.data.value ? YAML.parse(parsed.data.value) : {};

  await db.insert(variables).values({
    id: randomUUID(),
    uid: user!.id,
    type: parsed.data.type,
    key: parsed.data.key,
    key2: parsed.data.key2 ?? parsed.data.key,
    value: encrypt(JSON.stringify(yamlObj), secret),
    updatedAt: new Date(),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
