import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { infrastructures, softwares, variables } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";
import { jsonError, requireApiUser } from "@/lib/api-utils";
import { normalizeInfrastructureIcon } from "@/lib/infrastructure-icons";

type ImportProject = {
  infrastructure: Record<string, unknown>;
  softwares?: Array<Record<string, unknown>>;
  variables?: Array<Record<string, unknown>>;
};

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const body = (await request.json()) as { projects?: ImportProject[] };
  if (!Array.isArray(body.projects)) {
    return jsonError("projects is required", 400);
  }

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return jsonError("AUTH_SECRET is missing", 500);

  function asOptionalString(value: unknown) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  function remapIdentifier(value: string, maps: Array<Map<string, string>>) {
    for (const map of maps) {
      const mapped = map.get(value);
      if (mapped) return mapped;
    }
    return value;
  }

  for (const project of body.projects) {
    const infrastructureIdMap = new Map<string, string>();
    const softwareIdMap = new Map<string, string>();

    const iid = randomUUID();
    const infra = project.infrastructure ?? {};
    const oldInfrastructureId = asOptionalString(infra.id);
    if (oldInfrastructureId) {
      infrastructureIdMap.set(oldInfrastructureId, iid);
    }

    await db.insert(infrastructures).values({
      id: iid,
      uid: user!.id,
      name: String(infra.name ?? "Imported project"),
      description: String(infra.description ?? ""),
      icon: normalizeInfrastructureIcon(String(infra.icon ?? "")),
      color: String(infra.color ?? ""),
      isArchived: Boolean(infra.isArchived ?? false),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const sw of project.softwares ?? []) {
      const sid = randomUUID();
      const oldSoftwareId = asOptionalString(sw.id);
      if (oldSoftwareId) {
        softwareIdMap.set(oldSoftwareId, sid);
      }

      await db.insert(softwares).values({
        id: sid,
        uid: user!.id,
        softwareId: String(sw.softwareId ?? sw.software ?? ""),
        domain: String(sw.domain ?? ""),
        domainAlias: String(sw.domainAlias ?? sw.domain_alias ?? ""),
        exposition: String(sw.exposition ?? ""),
        version: String(sw.version ?? "latest"),
        size: String(sw.size ?? "small"),
        instance: String(sw.instance ?? ""),
        status: Boolean(sw.status ?? true),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    for (const variable of project.variables ?? []) {
      const originalKey = String(variable.key ?? "");
      const originalKey2 = String(variable.key2 ?? originalKey);
      const mappedKey = remapIdentifier(originalKey, [infrastructureIdMap, softwareIdMap]);
      const mappedKey2 = remapIdentifier(originalKey2, [infrastructureIdMap, softwareIdMap]);
      const rawValue = variable.value ?? {};

      await db.insert(variables).values({
        id: randomUUID(),
        uid: user!.id,
        key: mappedKey,
        key2: mappedKey2,
        type: String(variable.type ?? "project"),
        value: encrypt(JSON.stringify(rawValue), secret),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
