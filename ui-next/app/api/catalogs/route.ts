import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db/client";
import { catalogs, variables } from "@/lib/db/schema";
import { CatalogCreateSchema } from "@/lib/validations/catalog";
import { jsonError, requireApiUser } from "@/lib/api-utils";

export async function GET(request: Request) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  const [items, settings] = await Promise.all([
    db.select().from(catalogs).orderBy(asc(catalogs.name)),
    db.query.variables.findFirst({
      where: and(eq(variables.key, "catalogs"), eq(variables.type, "settings")),
    }),
  ]);

  return NextResponse.json({ items, settingsId: settings?.id });
}

export async function POST(request: Request) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  const body = await request.json();
  const parsed = CatalogCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const existing = await db.query.catalogs.findFirst({
    where: eq(catalogs.name, parsed.data.name),
  });

  if (!existing) {
    await db.insert(catalogs).values({
      id: randomUUID(),
      name: parsed.data.name,
      version: parsed.data.version,
      forkable: parsed.data.forkable,
      fork: false,
      createdAt: new Date(),
    });
  } else {
    await db
      .update(catalogs)
      .set({
        version: parsed.data.version,
        forkable: parsed.data.forkable,
        updatedAt: new Date(),
      })
      .where(eq(catalogs.id, existing.id));
  }

  return NextResponse.json({ ok: true });
}
