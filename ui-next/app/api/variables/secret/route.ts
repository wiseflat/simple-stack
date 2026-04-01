import { randomBytes, randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { softwares, variables } from "@/lib/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import { VariableSecretSchema } from "@/lib/validations/variable";
import { jsonError, requireApiUser } from "@/lib/api-utils";

const MIN_PASSWORD_LENGTH = 1;
const MAX_PASSWORD_LENGTH = 4096;

function generatePassword(userpass?: string, nosymbols?: boolean, length = 100) {
  if (userpass) return userpass;
  const safeLength = Number.isFinite(length)
    ? Math.max(MIN_PASSWORD_LENGTH, Math.min(MAX_PASSWORD_LENGTH, Math.floor(length)))
    : 100;
  const lettersDigits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const symbols = "!@#$%^&*()_+[]{};:,.<>?/~";
  const charset = nosymbols ? lettersDigits : lettersDigits + symbols;
  const bytes = randomBytes(safeLength);
  return Array.from({ length: safeLength }, (_, i) => charset[bytes[i] % charset.length]).join("");
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const body = await request.json();
  const parsed = VariableSecretSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const model = parsed.data;
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return jsonError("AUTH_SECRET is missing", 500);

  let resolvedKey = model.key;
  let softwareRecord: typeof softwares.$inferSelect | undefined;
  if (model.type === "software") {
    softwareRecord = await db.query.softwares.findFirst({
      where: and(eq(softwares.uid, user!.id), eq(softwares.id, model.key)),
    });

    if (!softwareRecord) {
      softwareRecord = await db.query.softwares.findFirst({
        where: and(eq(softwares.uid, user!.id), eq(softwares.domain, model.key)),
      });
    }

    if (softwareRecord?.id) {
      resolvedKey = softwareRecord.id;
    }
  }

  let stored: Record<string, unknown> = {};

  let record = await db.query.variables.findFirst({
    where: and(
      eq(variables.uid, user!.id),
      eq(variables.type, model.type),
      eq(variables.key2, resolvedKey),
    ),
  });

  if (!record && model.type === "software") {
    // Fallback: some rows may still be keyed with the original input key.
    record = await db.query.variables.findFirst({
      where: and(
        eq(variables.uid, user!.id),
        eq(variables.type, model.type),
        eq(variables.key2, model.key),
      ),
    });
  }

  if (!record) {
    if (model.missing === "create") {
      if (!model.subkey) {
        return jsonError("subkey is required when missing=create", 400);
      }

      const generated = generatePassword(model.userpass, model.nosymbols, model.length);
      const obj = { [model.subkey]: generated };
      await db.insert(variables).values({
        id: randomUUID(),
        uid: user!.id,
        key: resolvedKey,
        key2: resolvedKey,
        type: model.type,
        value: encrypt(JSON.stringify(obj), secret),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return NextResponse.json(generated);
    }

    if (model.type === "software") {
      const software =
        softwareRecord ??
        (await db.query.softwares.findFirst({
          where: and(eq(softwares.uid, user!.id), eq(softwares.id, resolvedKey)),
        }));
      return NextResponse.json(software ?? {});
    }

    return jsonError("Missing variable", model.missing === "error" ? 461 : 460);
  }

  const decrypted = decrypt(record.value, secret);
  if (decrypted === null) {
    return jsonError("Unable to decrypt variable content", 500);
  }

  try {
    const parsed = JSON.parse(decrypted);
    stored = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    stored = {};
  }

  if (model.subkey) {
    const current = stored[model.subkey];
    const subExists = current !== undefined;

    if (!subExists && (model.missing === "warn" || model.missing === "error")) {
      return jsonError("Missing subkey", model.missing === "error" ? 461 : 460);
    }

    if (!subExists && model.missing === "create") {
      const generated = generatePassword(model.userpass, model.nosymbols, model.length);
      stored[model.subkey] = generated;
      await db
        .update(variables)
        .set({ value: encrypt(JSON.stringify(stored), secret), updatedAt: new Date() })
        .where(eq(variables.id, record.id));
      return NextResponse.json(generated);
    }

    if (model.overwrite) {
      const generated = generatePassword(model.userpass, model.nosymbols, model.length);
      stored[model.subkey] = generated;
      await db
        .update(variables)
        .set({ value: encrypt(JSON.stringify(stored), secret), updatedAt: new Date() })
        .where(eq(variables.id, record.id));
      return NextResponse.json(generated);
    }

    if (model.delete) {
      delete stored[model.subkey];
      await db
        .update(variables)
        .set({ value: encrypt(JSON.stringify(stored), secret), updatedAt: new Date() })
        .where(eq(variables.id, record.id));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(stored[model.subkey] ?? null);
  }

  if (model.type === "software") {
    const software =
      softwareRecord ??
      (await db.query.softwares.findFirst({
        where: and(eq(softwares.uid, user!.id), eq(softwares.id, resolvedKey)),
      }));
    return NextResponse.json({ ...stored, ...software });
  }

  return NextResponse.json(stored);
}
