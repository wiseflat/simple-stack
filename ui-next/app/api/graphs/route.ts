import { NextResponse } from "next/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { decrypt } from "@/lib/crypto";
import { infrastructures, softwares, variables } from "@/lib/db/schema";
import { requireApiUser, safeJsonParse } from "@/lib/api-utils";

type GraphNode = {
  id: string;
  key: string;
  group: number;
  description: string;
  collection: string;
  variableType?: string;
  variableKey?: string;
  variableKey2?: string;
  infrastructureName?: string;
  vid?: string;
};

type GraphLink = { source: string; target: string; value: number };

function buildGraph(dataset: Array<{ index_key?: string; infraId: string; infraName: string }>) {
  const nodes = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  const LEVELS = ["project", "provider", "region", "location", "instance"] as const;

  for (const { index_key, infraId, infraName } of dataset) {
    if (!index_key) continue;
    const parts = index_key.split(".");

    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const key = parts.slice(i).join(".");
      const group = parts.length - i;
      const collection = LEVELS[group - 1] ?? "unknown";
      const id = `${infraId}::${key}`;

      if (!nodes.has(id)) {
        nodes.set(id, {
          id,
          key,
          group,
          description: key,
          collection,
          variableType: collection,
          variableKey: infraId,
          // instance nodes: key2 = FQDN of the instance, all other levels: key2 = infra name
          variableKey2: collection === "instance" ? key : infraName,
          infrastructureName: infraName,
        });
      }

      if (i < parts.length - 1) {
        const parent = `${infraId}::${parts.slice(i + 1).join(".")}`;
        links.push({ source: id, target: parent, value: group - 1 });
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    links,
  };
}

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const [infraRows, softwareRows] = await Promise.all([
    db.select().from(infrastructures).where(eq(infrastructures.uid, user!.id)),
    db.select().from(softwares).where(eq(softwares.uid, user!.id)),
  ]);

  const infraIds = infraRows.map((row) => row.id);
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
    const rawValue = secret ? decrypt(row.value, secret) : null;
    if (rawValue) {
      tfstateByInfraId.set(row.key, rawValue);
    }
  }

  const dataset = infraRows
    .flatMap((item) => {
      const tfstateRaw = tfstateByInfraId.get(item.id) ?? "";
      const resources = safeJsonParse<{
        resources?: Array<{ type?: string; instances?: Array<{ attributes?: { name?: string } }> }>;
      }>(tfstateRaw, {}).resources ?? [];

      return resources.map((resource) => ({ resource, infraId: item.id, infraName: item.name }));
    })
    .filter(({ resource }) => resource.type === "ansible_host")
    .flatMap(({ resource, infraId, infraName }) =>
      (resource.instances ?? []).map((instance) => ({
        index_key: instance.attributes?.name,
        infraId,
        infraName,
      })),
    );

  const softwareNodes: GraphNode[] = softwareRows
    .filter((s) => !!s.id)
    .map((s) => ({
      id: s.id,
      key: s.domain || s.id,
      description: `${s.domain || s.id}${s.instance ? ` -> ${s.instance}` : ""}`,
      group: 7,
      collection: "software",
      variableType: "software",
      variableKey: s.id,
      variableKey2: s.domain || s.id,
      infrastructureName: s.domain || s.id,
    }));

  const graph = buildGraph(dataset);
  graph.nodes.push(...softwareNodes);

  const instanceNodeIdsByKey = new Map<string, string[]>();
  for (const node of graph.nodes) {
    if (node.collection === "instance") {
      const instanceKey = (node.key ?? "").trim().toLowerCase();
      if (!instanceKey) continue;
      const list = instanceNodeIdsByKey.get(instanceKey) ?? [];
      list.push(node.id);
      instanceNodeIdsByKey.set(instanceKey, list);
    }
  }

  const softwareLinks: GraphLink[] = softwareRows
    .filter((s) => !!s.id && !!s.instance)
    .flatMap((s) => {
      const instanceKey = (s.instance ?? "").trim().toLowerCase();
      const targets = instanceNodeIdsByKey.get(instanceKey) ?? [];
      if (!targets.length) return [];
      return targets.map((target) => ({ source: s.id, target, value: 6 }));
    });

  graph.links.push(...softwareLinks);

  const variableKeys = [...new Set(graph.nodes.map((node) => node.variableKey).filter((key): key is string => !!key))];
  const nodeVariables = variableKeys.length
    ? await db
        .select({ id: variables.id, key: variables.key, key2: variables.key2, type: variables.type })
        .from(variables)
        .where(
          and(
            eq(variables.uid, user!.id),
            inArray(variables.key, variableKeys),
            ne(variables.type, "secret"),
          ),
        )
    : [];

  const variableIdByKeyTypeAndKey2 = new Map<string, string>();
  const legacyVariableIdByKeyAndType = new Map<string, string>();
  for (const variable of nodeVariables) {
    const exactMapKey = `${variable.type}:${variable.key}:${variable.key2 ?? ""}`;
    if (!variableIdByKeyTypeAndKey2.has(exactMapKey)) {
      variableIdByKeyTypeAndKey2.set(exactMapKey, variable.id);
    }

    const legacyMapKey = `${variable.type}:${variable.key}`;
    if ((!variable.key2 || variable.key2 === variable.key) && !legacyVariableIdByKeyAndType.has(legacyMapKey)) {
      legacyVariableIdByKeyAndType.set(legacyMapKey, variable.id);
    }
  }

  for (const node of graph.nodes) {
    if (!node.variableType || !node.variableKey) continue;
    const variableId =
      variableIdByKeyTypeAndKey2.get(`${node.variableType}:${node.variableKey}:${node.variableKey2 ?? ""}`) ??
      legacyVariableIdByKeyAndType.get(`${node.variableType}:${node.variableKey}`);
    if (variableId) {
      node.vid = variableId;
    }
  }

  return NextResponse.json(graph);
}
