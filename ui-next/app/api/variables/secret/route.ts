import { randomBytes, randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { infrastructures, softwares, variables } from "@/lib/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import { VariableSecretSchema } from "@/lib/validations/variable";
import { jsonError, requireApiUser } from "@/lib/api-utils";

const MIN_PASSWORD_LENGTH = 1;
const MAX_PASSWORD_LENGTH = 4096;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(val: string) { return UUID_RE.test(val); }

/**
 * Given an instance FQDN (e.g. "instance001.frontends.region.provider.test"), walk
 * all tfstate variables owned by this user and return the infraId whose Ansible
 * inventory contains that instance, or null if not found.
 */
async function resolveInfraIdFromFQDN(uid: string, fqdn: string, authSecret: string): Promise<string | null> {
  const tfstateRows = await db.query.variables.findMany({
    where: and(eq(variables.uid, uid), eq(variables.type, "tfstate")),
    columns: { key: true, value: true },
  });
  for (const row of tfstateRows) {
    const raw = decrypt(row.value, authSecret);
    if (!raw) continue;
    let tfstate: { resources?: Array<{ type?: string; instances?: Array<{ attributes?: { name?: string } }> }> };
    try { tfstate = JSON.parse(raw) as typeof tfstate; } catch { continue; }
    const hosts = (tfstate.resources ?? [])
      .filter((r) => r.type === "ansible_host")
      .flatMap((r) => r.instances ?? [])
      .map((i) => i.attributes?.name)
      .filter((n): n is string => !!n);
    if (hosts.includes(fqdn)) return row.key; // row.key = infraId
  }
  return null;
}

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

  // lookupKey2: the human-readable identifier used to look up the variable row (by key2 column).
  // Callers targeting infrastructure instances now send key2=<FQDN>; older callers send key=<FQDN>.
  const lookupKey2 = model.key2 ?? model.key ?? "";
  if (!lookupKey2) return jsonError("key or key2 is required", 400);

  // storageKey: what we store in the key column (should be a UUID that references the parent entity).
  // We start with either the explicit key (if it's a UUID) or the lookupKey2; resolution below may
  // upgrade it to the proper infrastructure UUID.
  let storageKey = (model.key && isUUID(model.key)) ? model.key : lookupKey2;

  let softwareRecord: typeof softwares.$inferSelect | undefined;
  if (model.type === "software") {
    softwareRecord = await db.query.softwares.findFirst({
      where: and(eq(softwares.uid, user!.id), eq(softwares.id, lookupKey2)),
    });
    if (!softwareRecord) {
      softwareRecord = await db.query.softwares.findFirst({
        where: and(eq(softwares.uid, user!.id), eq(softwares.domain, lookupKey2)),
      });
    }
    if (softwareRecord?.id) storageKey = softwareRecord.id;
  }

  let stored: Record<string, unknown> = {};

  // Look up existing variable row by (type, key2)
  const record = await db.query.variables.findFirst({
    where: and(
      eq(variables.uid, user!.id),
      eq(variables.type, model.type),
      eq(variables.key2, lookupKey2),
    ),
  });

  if (!record) {
    if (model.missing === "create") {
      if (!model.subkey) {
        return jsonError("subkey is required when missing=create", 400);
      }

      // For non-software secrets whose key is not yet a UUID, try to resolve the
      // infrastructure UUID from the FQDN via tfstate data.
      if (model.type !== "software" && !isUUID(storageKey)) {
        const infraId = await resolveInfraIdFromFQDN(user!.id, lookupKey2, secret);
        if (infraId) storageKey = infraId;
      }

      const generated = generatePassword(model.userpass, model.nosymbols, model.length);
      const obj = { [model.subkey]: generated };
      await db.insert(variables).values({
        id: randomUUID(),
        uid: user!.id,
        key: storageKey,
        key2: lookupKey2,
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
          where: and(eq(softwares.uid, user!.id), eq(softwares.id, storageKey)),
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
        where: and(eq(softwares.uid, user!.id), eq(softwares.id, storageKey)),
      }));
    return NextResponse.json({ ...stored, ...software });
  }

  return NextResponse.json(stored);
}
