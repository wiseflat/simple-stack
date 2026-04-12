import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { infrastructures } from "@/lib/db/schema";
import { jsonError, requireApiUser } from "@/lib/api-utils";
import { cleanupInfrastructureVariables } from "@/lib/infrastructure-cleanup";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;

  // Verify infrastructure exists and user has access
  const row = await db.query.infrastructures.findFirst({
    where: and(eq(infrastructures.id, id), eq(infrastructures.uid, user!.id)),
  });
  if (!row) return jsonError("Infrastructure not found", 404);

  const body = await request.json();
  const action = body.action as string | undefined;

  if (action !== "remove") {
    return jsonError("Invalid action for remove endpoint", 400);
  }

  // Delete linked variables/secrets if they exist.
  await cleanupInfrastructureVariables(user!.id, id);

  // Delete the infrastructure.
  await db
    .delete(infrastructures)
    .where(and(eq(infrastructures.id, id), eq(infrastructures.uid, user!.id)));

  return NextResponse.json({
    ok: true,
    message: `Infrastructure '${row.name}' removed`,
    infrastructure: { id, name: row.name },
  });
}
