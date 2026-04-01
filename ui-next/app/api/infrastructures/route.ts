import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db/client";
import { infrastructures, variables } from "@/lib/db/schema";
import { jsonError, requireApiUser } from "@/lib/api-utils";
import { normalizeInfrastructureIcon } from "@/lib/infrastructure-icons";
import { InfrastructureCreateSchema } from "@/lib/validations/infrastructure";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const [items, settings] = await Promise.all([
    db
      .select()
      .from(infrastructures)
      .where(eq(infrastructures.uid, user!.id))
      .orderBy(asc(infrastructures.name)),
    db.query.variables.findFirst({
      where: and(
        eq(variables.key, "infrastructures"),
        eq(variables.type, "settings"),
      ),
    }),
  ]);

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      icon: normalizeInfrastructureIcon(i.icon),
      color: i.color,
    })),
    settingsId: settings?.id,
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const body = await request.json();
  const parsed = InfrastructureCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  await db.insert(infrastructures).values({
    id: randomUUID(),
    uid: user!.id,
    name: parsed.data.name,
    description: parsed.data.description,
    icon: parsed.data.icon,
    color: parsed.data.color,
    isArchived: false,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
