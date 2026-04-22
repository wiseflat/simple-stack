import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { variables } from "@/lib/db/schema";

export async function cleanupInfrastructureVariables(uid: string, infrastructureId: string) {
  // Deletes variables and secrets only for this user and this infrastructure id.
  await db
    .delete(variables)
    .where(
      and(
        eq(variables.uid, uid),
        or(eq(variables.key, infrastructureId), eq(variables.key2, infrastructureId)),
      ),
    );
}
