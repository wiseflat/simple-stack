import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { infrastructures, softwares, variables } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import { jsonError, requireApiUser, safeJsonParse } from "@/lib/api-utils";

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const body = (await request.json()) as { projects?: string[] };
  const ids = Array.isArray(body.projects) ? body.projects : [];
  if (!ids.length) return jsonError("projects is required", 400);

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) return jsonError("AUTH_SECRET is missing", 500);

  const infraRows = await db
    .select()
    .from(infrastructures)
    .where(and(eq(infrastructures.uid, user!.id), inArray(infrastructures.id, ids)));

  const output = [] as Array<{
    infrastructure: unknown;
    softwares: unknown[];
    variables: unknown[];
  }>;

  for (const infra of infraRows) {
    const tfstateVar = await db.query.variables.findFirst({
      where: and(
        eq(variables.uid, user!.id),
        eq(variables.key, infra.id),
        eq(variables.type, "tfstate"),
      ),
    });

    const tfstateRaw = tfstateVar ? (decrypt(tfstateVar.value, secret) ?? "{}") : "{}";
    const hostnames = (safeJsonParse<{ resources?: Array<{ type?: string; instances?: Array<{ attributes?: { name?: string } }> }> }>(
      tfstateRaw,
      {},
    ).resources ?? [])
      .filter((r) => r.type === "ansible_host")
      .flatMap((r) => r.instances ?? [])
      .map((i) => i.attributes?.name)
      .filter((v): v is string => !!v);

    const relatedSoftwares = hostnames.length
      ? await db.select().from(softwares).where(and(eq(softwares.uid, user!.id), inArray(softwares.instance, hostnames)))
      : [];

    const variableKeys = new Set<string>([infra.id]);
    hostnames.forEach((h) => variableKeys.add(h));
    relatedSoftwares.forEach((s) => {
      if (s.id) variableKeys.add(s.id);
    });

    const relatedVariables = variableKeys.size
      ? await db
          .select()
          .from(variables)
          .where(and(eq(variables.uid, user!.id), inArray(variables.key, Array.from(variableKeys))))
      : [];

    const decryptedVariables = relatedVariables.map((v) => {
      const raw = decrypt(v.value, secret) ?? v.value;
      try {
        return { ...v, value: JSON.parse(raw) };
      } catch {
        return { ...v, value: raw };
      }
    });

    output.push({
      infrastructure: infra,
      softwares: relatedSoftwares,
      variables: decryptedVariables,
    });
  }

  return NextResponse.json(output);
}
