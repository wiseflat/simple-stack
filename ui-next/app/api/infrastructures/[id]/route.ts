import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { infrastructures, variables } from "@/lib/db/schema";
import { normalizeInfrastructureIcon } from "@/lib/infrastructure-icons";
import { InfrastructureUpdateSchema } from "@/lib/validations/infrastructure";
import { jsonError, requireApiUser } from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const row = await db.query.infrastructures.findFirst({
    where: and(eq(infrastructures.id, id), eq(infrastructures.uid, user!.id)),
  });
  if (!row) return jsonError("Not found", 404);

  return NextResponse.json({
    id: row.id,
    name: row.name,
    description: row.description,
    icon: normalizeInfrastructureIcon(row.icon),
    color: row.color,
  });
}

export async function PUT(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  const body = await request.json();
  const parsed = InfrastructureUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  await db
    .update(infrastructures)
    .set({
      name: parsed.data.name,
      description: parsed.data.description,
      icon: parsed.data.icon,
      color: parsed.data.color,
      updatedAt: new Date(),
    })
    .where(and(eq(infrastructures.id, id), eq(infrastructures.uid, user!.id)));

  await db
    .update(variables)
    .set({ key2: parsed.data.name, updatedAt: new Date() })
    .where(
      and(
        eq(variables.uid, user!.id),
        eq(variables.key, id),
        inArray(variables.type, ["project", "tfstate"]),
      ),
    );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;
  await db
    .delete(infrastructures)
    .where(and(eq(infrastructures.id, id), eq(infrastructures.uid, user!.id)));
  return NextResponse.json({ ok: true });
}
