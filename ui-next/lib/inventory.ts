import { db } from "@/lib/db/client";
import { catalogs, variables } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { safeJsonParse } from "@/lib/api-utils";
import YAML from "yaml";

export type HostEntry = { id: string; hostname: string };

async function readKey2Variables(key2: string, uid: string) {
  const rows = await db
    .select()
    .from(variables)
    .where(
      and(
        eq(variables.uid, uid),
        eq(variables.key2, key2),
        inArray(variables.type, ["project", "provider", "location", "region", "instance"]),
      ),
    );

  const secret = process.env.AUTH_SECRET ?? "";
  const merged: Record<string, unknown> = {};

  for (const row of rows) {
    const raw = decrypt(row.value, secret) ?? row.value;
    try {
      Object.assign(merged, JSON.parse(raw));
    } catch {
      try {
        const yamlValue = YAML.parse(raw);
        if (yamlValue && typeof yamlValue === "object") {
          Object.assign(merged, yamlValue as Record<string, unknown>);
        } else if (row.type) {
          merged[row.type] = yamlValue;
        }
      } catch {
        if (row.type) merged[row.type] = raw;
      }
    }
  }

  return merged;
}

export async function buildInventory(hosts: HostEntry[], uid: string) {
  const inventory: Record<string, unknown> = {
    _meta: { hostvars: {} as Record<string, unknown> },
  };
  const rootGroup = "infrastructure";

  const ensureGroup = async (name: string) => {
    if (!inventory[name]) {
      inventory[name] = {
        hosts: [] as string[],
        children: [] as string[],
        vars: await readKey2Variables(name, uid),
      };
    }
  };

  const addChild = async (parent: string, child: string) => {
    await ensureGroup(parent);
    await ensureGroup(child);
    const parentGroup = inventory[parent] as { children: string[] };
    if (!parentGroup.children.includes(child)) {
      parentGroup.children.push(child);
    }
  };

  await ensureGroup(rootGroup);

  for (const host of hosts) {
    const parts = host.hostname.split(".");
    if (parts.length < 5) continue;

    const [, location, region, provider, project] = parts;

    const projectGroup = project;
    const providerGroup = `${provider}_${project}`;
    const regionGroup = `${region}_${provider}_${project}`;
    const locationGroup = `${location}_${region}_${provider}_${project}`;
    for (const g of [projectGroup, providerGroup, regionGroup, locationGroup]) {
      await ensureGroup(g);
    }

    await addChild(rootGroup, projectGroup);
    await addChild(projectGroup, providerGroup);
    await addChild(providerGroup, regionGroup);
    await addChild(regionGroup, locationGroup);

    const leaf = inventory[locationGroup] as { hosts: string[] };
    if (!leaf.hosts.includes(host.hostname)) {
      leaf.hosts.push(host.hostname);
    }

    const hostVars = await readKey2Variables(host.hostname, uid);
    (hostVars as { projectid?: string }).projectid = host.id;
    const meta = inventory._meta as { hostvars: Record<string, unknown> };
    meta.hostvars[host.hostname] = hostVars;
  }

  const catalogRows = await db.select().from(catalogs);
  const infrastructureGroup = inventory[rootGroup] as { vars: Record<string, unknown> };
  infrastructureGroup.vars.catalogs = catalogRows.reduce<Record<string, { version: string | null; fork: boolean }>>(
    (acc, cur) => {
      acc[cur.name] = { version: cur.version, fork: !!cur.fork };
      return acc;
    },
    {},
  );

  return inventory;
}

export function extractHostnamesFromTfstate(tfstateRaw: string | null): string[] {
  const tfstate = safeJsonParse<{ resources?: Array<{ type?: string; instances?: Array<{ attributes?: { name?: string } }> }> }>(
    tfstateRaw,
    {},
  );

  const hosts: string[] = [];
  for (const resource of tfstate.resources ?? []) {
    if (resource.type !== "ansible_host") continue;
    for (const instance of resource.instances ?? []) {
      const hostname = instance.attributes?.name;
      if (hostname) hosts.push(hostname);
    }
  }
  return hosts;
}
