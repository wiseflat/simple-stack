import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import YAML from "yaml";
import { db } from "@/lib/db/client";
import { softwares, variables } from "@/lib/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  VariableReadSchema,
  VariableUpdateSchema,
} from "@/lib/validations/variable";
import { jsonError, requireApiUser } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const key2 = url.searchParams.get("key2") ?? undefined;
  const type = url.searchParams.get("type") ?? "";
  const format = url.searchParams.get("format") ?? "json";

  const parsedInput = VariableReadSchema.safeParse({ key, key2, type, format });
  if (!parsedInput.success) {
    return jsonError(parsedInput.error.issues[0]?.message ?? "Invalid query", 400);
  }

  const row = await db.query.variables.findFirst({
    where: and(
      eq(variables.uid, user!.id),
      eq(variables.id, id),
      eq(variables.type, parsedInput.data.type),
      eq(variables.key, parsedInput.data.key),
    ),
  });

  if (!row) return jsonError("Variable not found", 404);
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) {
    return jsonError("AUTH_SECRET is missing", 500);
  }

  const decrypted = decrypt(row.value, secret);
  if (decrypted === null) {
    return jsonError("Unable to decrypt variable content", 500);
  }

  let value: unknown = {};
  try {
    value = JSON.parse(decrypted);
  } catch {
    value = decrypted;
  }

  const output = {
    ...row,
    value:
      parsedInput.data.format === "yaml"
        ? YAML.stringify(value ?? {})
        : value ?? {},
  };

  return NextResponse.json(output);
}

export async function PUT(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = VariableUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return jsonError("AUTH_SECRET is missing", 500);

  const yamlObj = parsed.data.value ? YAML.parse(parsed.data.value) : {};

  await db
    .update(variables)
    .set({
      value: encrypt(JSON.stringify(yamlObj), secret),
      key2: parsed.data.key2 ?? parsed.data.key,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(variables.uid, user!.id),
        eq(variables.id, id),
        eq(variables.type, parsed.data.type),
        eq(variables.key, parsed.data.key),
      ),
    );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  await db.delete(variables).where(eq(variables.id, id));
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: Params) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  // Backward compatible helpers for read2/read3 from TotalJS.
  const { id } = await params;
  const body = (await request.json()) as { mode?: "read2" | "read3"; key2?: string; key?: string; type?: string };
  const secret = process.env.AUTH_SECRET ?? "";

  if (body.mode === "read2") {
    const key2 = String(body.key2 ?? "");
    const rows = await db
      .select()
      .from(variables)
      .where(eq(variables.key2, key2));

    const merged: Record<string, unknown> = {};
    for (const row of rows) {
      const decrypted = decrypt(row.value, secret);
      const raw = decrypted ?? row.value;
      try {
        Object.assign(merged, JSON.parse(raw));
      } catch {
        Object.assign(merged, { [row.key]: raw });
      }
    }
    return NextResponse.json(merged);
  }

  if (body.mode === "read3") {
    const row = await db.query.variables.findFirst({
      where: and(eq(variables.key, String(body.key ?? "")), eq(variables.type, String(body.type ?? ""))),
    });

    if (!row) return NextResponse.json({});

    const decrypted = decrypt(row.value, secret);
    const raw = decrypted ?? row.value;
    try {
      return NextResponse.json({ ...row, value: JSON.parse(raw) });
    } catch {
      return NextResponse.json({ ...row, value: raw });
    }
  }

  const software = await db.query.softwares.findFirst({ where: eq(softwares.id, id) });
  return NextResponse.json(software ?? {});
}
