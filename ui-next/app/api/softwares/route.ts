import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db/client";
import { catalogs, softwares, variables } from "@/lib/db/schema";
import { jsonError, requireApiUser } from "@/lib/api-utils";
import { SoftwareCreateSchema } from "@/lib/validations/software";

function normalizeDomainAlias(raw?: string) {
  if (!raw) return "";
  const aliases = raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(aliases)].join(",");
}

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  // Support filtering by domain
  const url = new URL(request.url);
  const domainFilter = url.searchParams.get("domain");
  const normalizedDomain = domainFilter?.trim().toLowerCase();
  const whereClause = normalizedDomain
    ? and(eq(softwares.uid, user!.id), eq(softwares.domain, normalizedDomain))
    : eq(softwares.uid, user!.id);

  const [items, settings] = await Promise.all([
    db.select().from(softwares).where(whereClause).orderBy(asc(softwares.instance)),
    db.query.variables.findFirst({
      where: and(eq(variables.key, "softwares"), eq(variables.type, "settings")),
    }),
  ]);

  const enriched = await Promise.all(
    items.map(async (item) => {
      const softwareRec = item.softwareId
        ? await db.query.catalogs.findFirst({ where: eq(catalogs.id, item.softwareId) })
        : null;
      const variableRec = item.id
        ? await db.query.variables.findFirst({
            where: and(
              eq(variables.uid, user!.id),
              eq(variables.key, item.id),
              eq(variables.type, "software"),
            ),
          })
        : null;
      const secretRec = item.id
        ? await db.query.variables.findFirst({
            where: and(
              eq(variables.uid, user!.id),
              eq(variables.key, item.id),
              eq(variables.type, "secret"),
            ),
          })
        : null;

      return {
        ...item,
        software: softwareRec ? { name: softwareRec.name, version: softwareRec.version } : null,
        vid: variableRec?.id,
        sid: secretRec?.id,
      };
    }),
  );

  return NextResponse.json({ items: enriched, settingsId: settings?.id });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const body = await request.json();
  const parsed = SoftwareCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const normalizedDomain = parsed.data.domain.trim().toLowerCase();
  const existing = await db.query.softwares.findFirst({
    where: and(eq(softwares.uid, user!.id), eq(softwares.domain, normalizedDomain)),
  });
  if (existing) {
    return jsonError("Domain already exists", 409);
  }

  await db.insert(softwares).values({
    id: randomUUID(),
    uid: user!.id,
    instance: parsed.data.instance,
    softwareId: parsed.data.software,
    size: parsed.data.size,
    domain: normalizedDomain,
    domainAlias: normalizeDomainAlias(parsed.data.domain_alias),
    exposition: parsed.data.exposition,
    version: "latest",
    status: true,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
