import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { infrastructures, softwares, variables } from "@/lib/db/schema";
import { requireApiUser, jsonError } from "@/lib/api-utils";

type OrphanReason =
  | "infra-uuid-not-found"           // key is not a valid infra UUID
  | "software-id-not-found"          // key is not a valid software ID
  | "instance-not-found"             // secret: key2 not found in graph for this infra
  | "settings-key-unknown"           // settings: key not in known list
  | "legacy-secret-key-format"       // secret: key is not UUID (old format)
  | "no-key2"                        // secret: key2 is empty/missing
  | "unknown";

type OrphanRecord = {
  id: string;
  type: string;
  key: string;
  key2: string | null;
  reason: OrphanReason;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KNOWN_SETTINGS_KEYS = new Set(["softwares", "catalogs", "infrastructures", "runner", "general"]);

// Types that reference infrastructure by UUID
const INFRA_TYPES = new Set(["project", "provider", "region", "location", "instance", "tfstate"]);

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  try {
    // Fetch all needed data in parallel
    const [allVars, infraRows, swRows, graphRes] = await Promise.all([
      db.query.variables.findMany({ where: eq(variables.uid, user!.id) }),
      db.query.infrastructures.findMany({ where: eq(infrastructures.uid, user!.id) }),
      db.query.softwares.findMany({ where: eq(softwares.uid, user!.id) }),
      fetch(`${new URL(request.url).origin}/api/graphs`, { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]);

    const validInfraIds = new Set(infraRows.map((i) => i.id));
    const validSwIds = new Set(swRows.map((s) => s.id));

    // Parse graph nodes to extract instance info
    // nodes format: { id: "uuid::fqdn", key: "fqdn", variableKey: "uuid", variableKey2: "fqdn", collection: "instance" }
    const instancesByInfra = new Map<string, Set<string>>();
    if (graphRes && graphRes.nodes) {
      for (const node of graphRes.nodes) {
        if (node.collection === "instance" && node.variableKey && node.variableKey2) {
          const fqdnSet = instancesByInfra.get(node.variableKey) ?? new Set();
          fqdnSet.add(node.variableKey2);
          instancesByInfra.set(node.variableKey, fqdnSet);
        }
      }
    }

    const orphans: OrphanRecord[] = [];

    for (const v of allVars) {
      let isOrphan = false;
      let reason: OrphanReason = "unknown";

      if (INFRA_TYPES.has(v.type)) {
        // project, provider, region, location, instance, tfstate: key must be valid infra UUID
        if (!validInfraIds.has(v.key)) {
          isOrphan = true;
          reason = "infra-uuid-not-found";
        }
      } else if (v.type === "secret") {
        // secret: key must be valid infra UUID
        if (!UUID_RE.test(v.key)) {
          // Legacy format check: if key is not UUID, mark as legacy
          isOrphan = true;
          reason = "legacy-secret-key-format";
        } else if (!validInfraIds.has(v.key)) {
          // UUID but infra doesn't exist
          isOrphan = true;
          reason = "infra-uuid-not-found";
        } else if (!v.key2) {
          // No key2 (instance identifier)
          isOrphan = true;
          reason = "no-key2";
        } else {
          // Check if instance exists in graph for this infra
          const instances = instancesByInfra.get(v.key);
          if (!instances || !instances.has(v.key2)) {
            isOrphan = true;
            reason = "instance-not-found";
          }
        }
      } else if (v.type === "software") {
        // software: key must be valid software ID
        if (!validSwIds.has(v.key)) {
          isOrphan = true;
          reason = "software-id-not-found";
        }
      } else if (v.type === "settings") {
        // settings: key must be in known list
        if (!KNOWN_SETTINGS_KEYS.has(v.key)) {
          isOrphan = true;
          reason = "settings-key-unknown";
        }
      }

      if (isOrphan) {
        orphans.push({
          id: v.id,
          type: v.type,
          key: v.key,
          key2: v.key2,
          reason,
        });
      }
    }

    return NextResponse.json({
      orphans,
      counts: {
        total: allVars.length,
        orphans: orphans.length,
      },
    });
  } catch (err) {
    console.error("Variables integrity check failed:", err);
    return jsonError("Integrity check failed", 500);
  }
}
