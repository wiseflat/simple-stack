import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { catalogs } from "@/lib/db/schema";
import { CatalogUpdateSchema } from "@/lib/validations/catalog";
import { jsonError, requireApiUser } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const row = await db.query.catalogs.findFirst({ where: eq(catalogs.id, id) });
  if (!row) return jsonError("Not found", 404);
  return NextResponse.json(row);
}

export async function PUT(request: Request, { params }: Params) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = CatalogUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  await db
    .update(catalogs)
    .set({
      alias: parsed.data.alias,
      description: parsed.data.description,
      documentation: parsed.data.documentation,
      cron: parsed.data.cron,
      crontab: parsed.data.crontab,
      updatedAt: new Date(),
    })
    .where(eq(catalogs.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  await db.delete(catalogs).where(eq(catalogs.id, id));
  return NextResponse.json({ ok: true });
}
