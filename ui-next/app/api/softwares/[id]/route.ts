import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { catalogs, softwares, variables } from "@/lib/db/schema";
import {
  SoftwareExecuteSchema,
  SoftwareUpdateSchema,
  SoftwareVersionUpdateSchema,
} from "@/lib/validations/software";
import { jsonError, requireApiUser } from "@/lib/api-utils";
import { decrypt } from "@/lib/crypto";
import { safeJsonParse } from "@/lib/api-utils";

function normalizeDomainAlias(raw?: string) {
  if (!raw) return "";
  const aliases = raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(aliases)].join(",");
}

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;

  const [tfstateVars, softwareDefs, item] = await Promise.all([
    db.select().from(variables).where(and(eq(variables.uid, user!.id), eq(variables.type, "tfstate"))),
    db.select({ id: catalogs.id, name: catalogs.name }).from(catalogs),
    db.query.softwares.findFirst({
      where: and(eq(softwares.uid, user!.id), eq(softwares.id, id)),
    }),
  ]);

  if (!item) return jsonError("Not found", 404);

  const secret = process.env.AUTH_SECRET ?? "";
  const flattenedInstances = tfstateVars.flatMap((v) => {
    try {
      const decrypted = decrypt(v.value, secret);
      const parsed = JSON.parse(decrypted ?? "{}");
      return (parsed.resources ?? [])
        .filter((r: { type?: string }) => r.type === "ansible_host")
        .flatMap((r: { instances?: Array<{ attributes?: { name?: string } }> }) =>
          (r.instances ?? [])
            .map((i) => i.attributes?.name)
            .filter((name): name is string => !!name)
            .map((name) => ({ id: name, name })),
        );
    } catch {
      return [];
    }
  });

  return NextResponse.json({
    instances: flattenedInstances,
    softwares: softwareDefs,
    sizes: [
      { id: "tiny", name: "Tiny" },
      { id: "small", name: "Small" },
      { id: "medium", name: "Medium" },
      { id: "large", name: "Large" },
      { id: "xxl", name: "XXL" },
    ],
    expositions: [
      { id: "public", name: "Public" },
      { id: "local", name: "Local" },
      { id: "none", name: "None" },
    ],
    item,
  });
}

export async function PUT(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const body = await request.json();

  if (typeof body?.version === "string" && Object.keys(body).length === 1) {
    const parsedVersion = SoftwareVersionUpdateSchema.safeParse(body);
    if (!parsedVersion.success) {
      return jsonError(parsedVersion.error.issues[0]?.message ?? "Invalid payload", 400);
    }

    const updateResult = await db
      .update(softwares)
      .set({ version: parsedVersion.data.version, updatedAt: new Date() })
      .where(and(eq(softwares.uid, user!.id), eq(softwares.id, id)));

    return NextResponse.json({ ok: true });
  }

  const parsed = SoftwareUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const existing = await db.query.softwares.findFirst({
    where: and(eq(softwares.uid, user!.id), eq(softwares.id, id)),
  });
  if (!existing) return jsonError("Not found", 404);

  const incomingDomain = parsed.data.domain.trim().toLowerCase();
  const existingDomain = (existing.domain ?? "").trim().toLowerCase();
  const incomingCatalog = parsed.data.software.trim();
  const existingCatalog = (existing.softwareId ?? "").trim();
  const incomingInstance = parsed.data.instance.trim();
  const existingInstance = (existing.instance ?? "").trim();

  if (
    incomingDomain !== existingDomain ||
    incomingCatalog !== existingCatalog ||
    incomingInstance !== existingInstance
  ) {
    return jsonError("Instance, catalog and domain cannot be changed after creation", 400);
  }

  await db
    .update(softwares)
    .set({
      instance: existing.instance,
      softwareId: existing.softwareId,
      size: parsed.data.size,
      domain: existing.domain,
      domainAlias: normalizeDomainAlias(parsed.data.domain_alias),
      exposition: parsed.data.exposition,
      updatedAt: new Date(),
    })
    .where(and(eq(softwares.uid, user!.id), eq(softwares.id, id)));

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = SoftwareExecuteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const item = await db.query.softwares.findFirst({
    where: and(eq(softwares.uid, user!.id), eq(softwares.id, id)),
  });
  if (!item) return jsonError("Not found", 404);

  // Load runner settings (user-scoped or shared)
  let settingsRec = await db.query.variables.findFirst({
    where: and(
      eq(variables.uid, user!.id),
      eq(variables.key, "softwares"),
      eq(variables.type, "settings"),
    ),
  });

  if (!settingsRec) {
    settingsRec = await db.query.variables.findFirst({
      where: and(
        isNull(variables.uid),
        eq(variables.key, "softwares"),
        eq(variables.type, "settings"),
      ),
    });
  }

  if (!settingsRec?.value) {
    return jsonError("Runner settings not configured for softwares", 400);
  }

  // Decrypt settings
  const decryptedValue = decrypt(settingsRec.value, process.env.AUTH_SECRET!);
  if (!decryptedValue) {
    return jsonError("Unable to decrypt runner settings", 500);
  }

  const decryptedSettings = safeJsonParse<{
    url?: string;
    authentication?: boolean;
    login?: string;
    password?: string;
  }>(decryptedValue, {});

  if (!decryptedSettings.url) {
    return jsonError("Runner URL not configured in settings", 400);
  }

  // Load catalog name
  const catalog = await db.query.catalogs.findFirst({
    where: eq(catalogs.id, item.softwareId!),
  });

  if (!catalog) {
    return jsonError("Associated catalog not found", 404);
  }

  // Handle destroy_force: remove software variables/secrets
  if (parsed.data.action === "destroy_force") {
    await db
      .delete(variables)
      .where(
        and(
          eq(variables.uid, user!.id),
          eq(variables.key, item.id),
          eq(variables.type, "software"),
        ),
      );
    await db
      .delete(variables)
      .where(
        and(
          eq(variables.uid, user!.id),
          eq(variables.key, item.id),
          eq(variables.type, "secret"),
        ),
      );
  }

  // Build payload for runner
  const payload = {
    meta: { hosts: item.instance },
    project: item.instance?.split(".").pop(),
    type: "saas-operate",
    catalog: catalog.name,
    domain: item.domain,
    task: parsed.data.action,
    confirmation: "yes",
  };

  // Prepare headers with optional Basic auth
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (decryptedSettings.authentication && decryptedSettings.login && decryptedSettings.password) {
    const basicAuth = Buffer.from(`${decryptedSettings.login}:${decryptedSettings.password}`).toString(
      "base64",
    );
    headers["Authorization"] = `Basic ${basicAuth}`;
  }

  // Send to runner
  const runnerRes = await fetch(decryptedSettings.url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!runnerRes.ok) {
    const errorText = await runnerRes.text();
    return jsonError(`Runner error: ${errorText || runnerRes.statusText}`, runnerRes.status);
  }

  return NextResponse.json({ ok: true, action: parsed.data.action });
}

export async function DELETE(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  await db
    .delete(softwares)
    .where(and(eq(softwares.uid, user!.id), eq(softwares.id, id)));
  return NextResponse.json({ ok: true });
}
