import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { catalogs } from "@/lib/db/schema";
import {
  CatalogForkCreateSchema,
  CatalogForkUpdateSchema,
} from "@/lib/validations/catalog";
import { jsonError, requireApiUser } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = CatalogForkCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const parent = await db.query.catalogs.findFirst({ where: eq(catalogs.id, id) });
  if (!parent) return jsonError("Parent catalog not found", 404);

  const name = `${parsed.data.origin}-${parsed.data.suffix}`;
  const exists = await db.query.catalogs.findFirst({ where: eq(catalogs.name, name) });
  if (exists) return jsonError("Catalog item already exists", 409);

  await db.insert(catalogs).values({
    id: randomUUID(),
    name,
    origin: parsed.data.origin,
    version: parsed.data.version,
    suffix: parsed.data.suffix,
    alias: parsed.data.alias,
    description: parsed.data.description,
    cron: parsed.data.cron,
    crontab: parsed.data.crontab,
    dockerfileRoot: parsed.data.dockerfile_root,
    dockerfileNonroot: parsed.data.dockerfile_nonroot,
    fork: true,
    forkable: parent.forkable,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PUT(request: Request, { params }: Params) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = CatalogForkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  await db
    .update(catalogs)
    .set({
      name: `${parsed.data.origin}-${parsed.data.suffix}`,
      origin: parsed.data.origin,
      suffix: parsed.data.suffix,
      alias: parsed.data.alias,
      description: parsed.data.description,
      cron: parsed.data.cron,
      crontab: parsed.data.crontab,
      dockerfileRoot: parsed.data.dockerfile_root,
      dockerfileNonroot: parsed.data.dockerfile_nonroot,
      updatedAt: new Date(),
    })
    .where(eq(catalogs.id, id));

  return NextResponse.json({ ok: true });
}
