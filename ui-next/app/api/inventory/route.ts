import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { decrypt } from "@/lib/crypto";
import { infrastructures, variables } from "@/lib/db/schema";
import { buildInventory, extractHostnamesFromTfstate } from "@/lib/inventory";
import { requireApiUser } from "@/lib/api-utils";

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const rows = await db
    .select({ id: infrastructures.id })
    .from(infrastructures)
    .where(eq(infrastructures.uid, user!.id));

  const infraIds = rows.map((row) => row.id);
  const tfstateRows = infraIds.length
    ? await db
        .select({ key: variables.key, value: variables.value })
        .from(variables)
        .where(
          and(
            eq(variables.uid, user!.id),
            eq(variables.type, "tfstate"),
            inArray(variables.key, infraIds),
          ),
        )
    : [];

  const secret = process.env.AUTH_SECRET ?? "";
  const tfstateByInfraId = new Map<string, string>();
  for (const row of tfstateRows) {
    const decrypted = secret ? decrypt(row.value, secret) : null;
    if (decrypted) {
      tfstateByInfraId.set(row.key, decrypted);
    }
  }

  const dataset = rows.flatMap((item) =>
    extractHostnamesFromTfstate(tfstateByInfraId.get(item.id) ?? null).map((hostname) => ({
      id: item.id,
      hostname,
    })),
  );

  const inventory = await buildInventory(dataset, user!.id);
  return NextResponse.json(inventory);
}
