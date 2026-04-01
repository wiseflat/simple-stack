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

  for (const project of body.projects) {
    const iid = randomUUID();
    const infra = project.infrastructure ?? {};

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
      await db.insert(softwares).values({
        id: randomUUID(),
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
      const rawValue = variable.value ?? {};
      await db.insert(variables).values({
        id: randomUUID(),
        uid: user!.id,
        key: String(variable.key ?? ""),
        key2: String(variable.key2 ?? String(variable.key ?? "")),
        type: String(variable.type ?? "project"),
        value: encrypt(JSON.stringify(rawValue), secret),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
