"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import YAML from "yaml";

type GraphNode = {
  id: string;
  key?: string;
  group?: number;
  collection?: string;
  variableType?: string;
  variableKey?: string;
  variableKey2?: string;
  infrastructureName?: string;
};

type GraphLink = {
  source: string;
  target: string;
  value?: number;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

type VariableListItem = {
  id: string;
  type: string;
  key: string;
  key2?: string | null;
};

type VariableDialogState = {
  open: boolean;
  loading: boolean;
  saving: boolean;
  mode: "create" | "edit";
  variableId: string | null;
  type: string;
  key: string;
  key2: string;
  name: string;
  value: string;
  error: string | null;
};

type NodeActionDialogState = {
  open: boolean;
  type: string;
  key: string;
  key2: string;
  name: string;
};

type InfrastructureItem = {
  id: string;
  name: string;
};

const palette = ["#79a6d2", "#e38627", "#6f4e7c", "#5f9e6e", "#d84b6a", "#2f80ed", "#8d6e63", "#5fb3b3"];
const softwareNodeColor = "#f59e0b";

function getEndpointId(endpoint: unknown) {
  if (typeof endpoint === "string") return endpoint;
  if (endpoint && typeof endpoint === "object" && "id" in endpoint) {
    return String((endpoint as { id?: unknown }).id ?? "");
  }
  return "";
}

function isSoftwareLink(link: GraphLink) {
  return !getEndpointId(link.source).includes("::");
}

export default function ForceGraph3DPanel() {
  const graphRef = useRef<any>(null);
  const [GraphComponent, setGraphComponent] = useState<ComponentType<Record<string, unknown>> | null>(null);
  const [layoutMode, setLayoutMode] = useState<"compact" | "spaced">("spaced");
  const [selectedInfrastructureId, setSelectedInfrastructureId] = useState<string>("all");
  const [infrastructures, setInfrastructures] = useState<InfrastructureItem[]>([]);
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [variableDialog, setVariableDialog] = useState<VariableDialogState>({
    open: false,
    loading: false,
    saving: false,
    mode: "create",
    variableId: null,
    type: "",
    key: "",
    key2: "",
    name: "",
    value: "{}",
    error: null,
  });
  const [nodeActionDialog, setNodeActionDialog] = useState<NodeActionDialogState>({
    open: false,
    type: "",
    key: "",
    key2: "",
    name: "",
  });

  useEffect(() => {
    let mounted = true;

    void import("react-force-graph-3d")
      .then((mod) => {
        if (!mounted) return;
        setGraphComponent(() => mod.default as ComponentType<Record<string, unknown>>);
      })
      .catch((err) => {
        if (!mounted) return;
        setGraphError(err instanceof Error ? err.message : "Unable to load 3D graph library");
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!graphRef.current) return;

    const isSpaced = layoutMode === "spaced";
    const softwareDistance = isSpaced ? 170 : 125;
    const defaultDistance = isSpaced ? 95 : 80;
    const softwareStrength = isSpaced ? 0.25 : 0.5;
    const defaultStrength = isSpaced ? 0.7 : 0.82;
    const chargeStrength = isSpaced ? -200 : -145;

    const linkForce = graphRef.current.d3Force("link");
    if (linkForce) {
      linkForce.distance((link: GraphLink) => (isSoftwareLink(link) ? softwareDistance : defaultDistance));
      linkForce.strength((link: GraphLink) => (isSoftwareLink(link) ? softwareStrength : defaultStrength));
    }

    const chargeForce = graphRef.current.d3Force("charge");
    if (chargeForce) {
      chargeForce.strength(chargeStrength);
    }

    graphRef.current.d3ReheatSimulation();
  }, [data, layoutMode]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const [graphRes, infraRes] = await Promise.all([
          fetch("/api/graphs", { cache: "no-store" }),
          fetch("/api/infrastructures", { cache: "no-store" }),
        ]);

        if (!graphRes.ok) throw new Error(`HTTP ${graphRes.status}`);

        const json = (await graphRes.json()) as GraphData;
        if (mounted) setData(json);

        if (infraRes.ok) {
          const infraJson = (await infraRes.json()) as {
            items?: Array<{ id?: string; name?: string }>;
          };

          if (mounted) {
            setInfrastructures(
              (infraJson.items ?? [])
                .filter((item): item is { id: string; name: string } => !!item.id && !!item.name)
                .map((item) => ({ id: item.id, name: item.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            );
          }
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Unable to load graph");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredData = useMemo<GraphData>(() => {
    if (selectedInfrastructureId === "all") return data;

    const infraNodeIds = new Set(
      data.nodes.filter((node) => node.id.startsWith(`${selectedInfrastructureId}::`)).map((node) => node.id),
    );
    const linkedSoftwareNodeIds = new Set<string>();

    for (const link of data.links) {
      const sourceId = getEndpointId(link.source);
      const targetId = getEndpointId(link.target);
      const sourceInInfra = infraNodeIds.has(sourceId);
      const targetInInfra = infraNodeIds.has(targetId);

      if (sourceInInfra && !targetId.includes("::")) linkedSoftwareNodeIds.add(targetId);
      if (targetInInfra && !sourceId.includes("::")) linkedSoftwareNodeIds.add(sourceId);
    }

    const allowedNodeIds = new Set<string>([...infraNodeIds, ...linkedSoftwareNodeIds]);

    return {
      nodes: data.nodes.filter((node) => allowedNodeIds.has(node.id)),
      links: data.links.filter((link) => {
        const sourceId = getEndpointId(link.source);
        const targetId = getEndpointId(link.target);
        return allowedNodeIds.has(sourceId) && allowedNodeIds.has(targetId);
      }),
    };
  }, [data, selectedInfrastructureId]);

  const stats = useMemo(() => {
    return {
      nodes: filteredData.nodes.length,
      links: filteredData.links.length,
    };
  }, [filteredData]);

  const graphDataForRender = useMemo<GraphData>(() => {
    return {
      // 3d-force-graph mutates node positions in place; strip them to avoid carrying DAG locks into Force mode.
      nodes: filteredData.nodes.map((node) => {
        const { x, y, z, vx, vy, vz, fx, fy, fz, ...rest } = node as GraphNode & Record<string, unknown>;
        return { ...rest } as GraphNode;
      }),
      links: filteredData.links.map((link) => ({ ...link })),
    };
  }, [filteredData]);

  async function openVariableDialog(type: string, key: string, key2: string, name: string) {
    setVariableDialog({
      open: true,
      loading: true,
      saving: false,
      mode: "create",
      variableId: null,
      type,
      key,
      key2,
      name,
      value: "{}",
      error: null,
    });

    try {
      const listRes = await fetch(
        `/api/variables?type=${encodeURIComponent(type)}&key=${encodeURIComponent(key)}&key2=${encodeURIComponent(key2)}`,
        {
          cache: "no-store",
        },
      );
      if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);

      const items = (await listRes.json()) as VariableListItem[];
      if (!items.length) {
        setVariableDialog((prev) => ({
          ...prev,
          loading: false,
          mode: "create",
          variableId: null,
          value: "{}",
        }));
        return;
      }

      const first = items[0];
      const detailRes = await fetch(
        `/api/variables/${first.id}?key=${encodeURIComponent(first.key)}&key2=${encodeURIComponent(key2)}&type=${encodeURIComponent(first.type)}&format=yaml`,
        { cache: "no-store" },
      );
      if (!detailRes.ok) throw new Error(`HTTP ${detailRes.status}`);

      const detail = (await detailRes.json()) as {
        id: string;
        value: string | Record<string, unknown>;
      };

      setVariableDialog((prev) => ({
        ...prev,
        loading: false,
        mode: "edit",
        variableId: detail.id,
        value: typeof detail.value === "string" ? detail.value : YAML.stringify(detail.value ?? {}),
      }));
    } catch (err) {
      setVariableDialog((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unable to load variable set",
      }));
    }
  }

  async function saveVariableDialog() {
    if (variableDialog.saving || variableDialog.loading) return;

    try {
      YAML.parse(variableDialog.value || "{}");
    } catch (err) {
      setVariableDialog((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Invalid YAML content",
      }));
      return;
    }

    setVariableDialog((prev) => ({ ...prev, saving: true, error: null }));

    try {
      const payload = {
        type: variableDialog.type,
        key: variableDialog.key,
        key2: variableDialog.key2,
        value: variableDialog.value,
      };

      const res =
        variableDialog.mode === "edit" && variableDialog.variableId
          ? await fetch(`/api/variables/${variableDialog.variableId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/variables", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setVariableDialog((prev) => ({ ...prev, open: false, saving: false, error: null }));
    } catch (err) {
      setVariableDialog((prev) => ({
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : "Unable to save variable set",
      }));
    }
  }

  function getSecretTarget(type: string, key: string, key2: string) {
    const secretKey = type === "software" ? key2 || key : key2 || key;
    return {
      type: "secret",
      key: secretKey,
      key2: secretKey,
    };
  }

  function onNodeClick(node: object) {
    const current = node as GraphNode;
    const type = current.variableType ?? "";
    const key = current.variableKey ?? "";
    const key2 = current.variableKey2 ?? current.key ?? "";
    const clickableTypes = new Set(["project", "provider", "region", "location", "instance", "software"]);

    if (!type || !key || !key2 || !clickableTypes.has(type)) return;

    setNodeActionDialog({
      open: true,
      type,
      key,
      key2,
      name: current.infrastructureName ?? key2,
    });
  }

  function onRecenterClick() {
    if (!graphRef.current) return;
    graphRef.current.zoomToFit(350, 32);
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Infrastructure graph</h2>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onRecenterClick}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          >
            Recenter
          </button>

          <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-950">
            <span className="text-zinc-500">Infrastructure</span>
            <select
              value={selectedInfrastructureId}
              onChange={(event) => setSelectedInfrastructureId(event.target.value)}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="all">All</option>
              {infrastructures.map((infra) => (
                <option key={infra.id} value={infra.id}>
                  {infra.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-950">
            <span className="text-zinc-500">Layout</span>
            <select
              value={layoutMode}
              onChange={(event) => setLayoutMode(event.target.value as "compact" | "spaced")}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="compact">Compact</option>
              <option value="spaced">Spaced</option>
            </select>
          </div>

          <div className="rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            {stats.nodes} nodes / {stats.links} links
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading graph...</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</p>}
      {graphError && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">{graphError}</p>}

      {!loading && !error && !graphError && GraphComponent && (
        <div className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          <GraphComponent
            ref={graphRef}
            graphData={graphDataForRender}
            fitToCanvas
            nodeLabel={(node: object) => {
              const n = node as GraphNode;
              const label = n.key ?? n.id;
              if (n.collection === "software") {
                return `software: ${label}${n.variableKey2 ? `\nkey2: ${n.variableKey2}` : ""}`;
              }
              return `${label}${n.collection ? ` (${n.collection})` : ""}`;
            }}
            nodeAutoColorBy={(node: object) => {
              const n = node as GraphNode;
              return n.collection ?? String(n.group ?? 0);
            }}
            nodeVal={(node: object) => {
              const n = node as GraphNode;
              return n.collection === "software" ? 5 : 2.2;
            }}
            linkOpacity={0.3}
            linkColor={(link: object) => {
              const l = link as GraphLink;
              return isSoftwareLink(l) ? "#f59e0b" : "rgba(113,113,122,0.45)";
            }}
            linkWidth={(link: object) => {
              const l = link as GraphLink;
              const base = Math.max(1, Number(l.value ?? 1));
              return isSoftwareLink(l) ? Math.max(2.2, base) : base;
            }}
            backgroundColor="rgba(0,0,0,0)"
            nodeColor={(node: object) => {
              const n = node as GraphNode;
              if (n.collection === "software") return softwareNodeColor;
              const idx = Math.abs(Number(n.group ?? 0)) % palette.length;
              return palette[idx];
            }}
            onNodeClick={onNodeClick}
          />
        </div>
      )}

      {nodeActionDialog.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <h3 className="text-lg font-semibold">Open node data</h3>
              <p className="text-sm text-zinc-500">{nodeActionDialog.name}</p>
            </div>

            <div className="space-y-3 p-6">
              <button
                type="button"
                onClick={() => {
                  const current = nodeActionDialog;
                  setNodeActionDialog((prev) => ({ ...prev, open: false }));
                  void openVariableDialog(current.type, current.key, current.key2, current.name);
                }}
                className="w-full rounded-md border border-zinc-300 px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Open associated variables
              </button>

              <button
                type="button"
                onClick={() => {
                  const current = nodeActionDialog;
                  const secretTarget = getSecretTarget(current.type, current.key, current.key2);
                  setNodeActionDialog((prev) => ({ ...prev, open: false }));
                  void openVariableDialog(secretTarget.type, secretTarget.key, secretTarget.key2, `${current.name} (secret)`);
                }}
                className="w-full rounded-md border border-zinc-300 px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Open associated secret
              </button>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setNodeActionDialog((prev) => ({ ...prev, open: false }))}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {variableDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-semibold">
                  {variableDialog.mode === "edit" ? "Edit variable set" : "Create variable set"}
                </h3>
                <p className="text-sm text-zinc-500">{variableDialog.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setVariableDialog((prev) => ({ ...prev, open: false }))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <input
                  readOnly
                  value={variableDialog.type}
                  className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Key</label>
                <input
                  readOnly
                  value={variableDialog.key}
                  className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Key2</label>
                <input
                  readOnly
                  value={variableDialog.key2}
                  className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Content (YAML)</label>
                <textarea
                  value={variableDialog.value}
                  onChange={(event) =>
                    setVariableDialog((prev) => ({
                      ...prev,
                      value: event.target.value,
                    }))
                  }
                  rows={14}
                  spellCheck={false}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              {variableDialog.error && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 md:col-span-2">
                  {variableDialog.error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setVariableDialog((prev) => ({ ...prev, open: false }))}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
                  disabled={variableDialog.saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveVariableDialog()}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                  disabled={variableDialog.loading || variableDialog.saving}
                >
                  {variableDialog.loading
                    ? "Loading..."
                    : variableDialog.saving
                      ? "Saving..."
                      : variableDialog.mode === "edit"
                        ? "Save changes"
                        : "Create variable set"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
