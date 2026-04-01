"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookCopy,
  Boxes,
  LayoutDashboard,
  Network,
  ScrollText,
  Settings,
  UserCog,
  Users,
  Variable,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

type OpenApiOperation = {
  summary?: string;
  tags?: string[];
  responses?: Record<string, unknown>;
  requestBody?: {
    required?: boolean;
    content?: Record<string, unknown>;
  };
};

type OpenApiPathItem = Partial<Record<HttpMethod, OpenApiOperation>>;

type OpenApiDoc = {
  paths?: Record<string, OpenApiPathItem>;
};

type RouteItem = {
  feature: string;
  path: string;
  method: HttpMethod;
  summary: string;
  needsBody: boolean;
  responseCodes: string[];
};

type ApiResponse = {
  status: number;
  durationMs: number;
  contentType: string;
  bodyText: string;
};

const methodOrder: HttpMethod[] = ["get", "post", "put", "patch", "delete"];

function extractPathParams(path: string): string[] {
  const matches = path.match(/\{[^}]+\}/g) ?? [];
  return matches.map((raw) => raw.slice(1, -1));
}

function buildPathFromTemplate(path: string, pathParams: Record<string, string>): string {
  return path.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = pathParams[key] ?? "";
    return encodeURIComponent(value);
  });
}

function prettyPrint(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function toFeatureLabel(feature: string): string {
  const label = feature.replace(/[-_]/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getFeatureIcon(feature: string): LucideIcon {
  const featureIcons: Record<string, LucideIcon> = {
    account: UserCog,
    catalogs: BookCopy,
    events: ScrollText,
    graphs: Network,
    infrastructures: Network,
    inventory: Boxes,
    settings: Settings,
    softwares: Boxes,
    system: LayoutDashboard,
    users: Users,
    variables: Variable,
  };

  return featureIcons[feature] ?? LayoutDashboard;
}

function getMethodBadgeClass(method: HttpMethod): string {
  const base = "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide";
  const colors: Record<HttpMethod, string> = {
    get: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    post: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    put: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    patch: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
    delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  return `${base} ${colors[method]}`;
}

function getResponseStatusBadgeClass(status: number): string {
  const base = "rounded-full px-2 py-1 font-semibold";

  if (status >= 200 && status < 300) {
    return `${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`;
  }

  if (status >= 300 && status < 400) {
    return `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`;
  }

  if (status >= 400 && status < 500) {
    return `${base} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`;
  }

  if (status >= 500) {
    return `${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`;
  }

  return `${base} bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200`;
}

function getRequestExample(path: string, method: HttpMethod): unknown {
  const key = `${method.toUpperCase()} ${path}`;

  const examples: Record<string, unknown> = {
    "POST /api/account": {
      email: "admin@example.local",
      password: "Password123",
    },
    "POST /api/events": {
      event_type: "deploy",
      status: "success",
      message: "Deployment completed",
      timestamp: new Date().toISOString(),
    },
    "POST /api/catalogs": {
      name: "my_catalog",
      version: "1.0.0",
      forkable: true,
    },
    "PUT /api/catalogs/{id}": {
      alias: "My Catalog",
      description: "Catalog update description",
      documentation: "https://docs.example.com/catalog",
      cron: false,
      crontab: "* * * * *",
    },
    "POST /api/catalogs/{id}/fork": {
      origin: "catalog-origin-id",
      version: "1.0.0",
      suffix: "custom",
      alias: "My Fork",
      description: "Forked catalog",
      cron: false,
      crontab: "* * * * *",
      dockerfile_root: "FROM ubuntu:24.04",
      dockerfile_nonroot: "FROM ubuntu:24.04",
    },
    "PUT /api/catalogs/{id}/fork": {
      origin: "catalog-origin-id",
      suffix: "custom",
      alias: "My Fork",
      description: "Updated forked catalog",
      cron: false,
      crontab: "* * * * *",
      dockerfile_root: "FROM ubuntu:24.04",
      dockerfile_nonroot: "FROM ubuntu:24.04",
    },
    "POST /api/infrastructures": {
      name: "frontends-main",
      description: "Main frontend infrastructure",
      icon: "server",
      color: "#1d4ed8",
    },
    "PUT /api/infrastructures/{id}": {
      name: "frontends-main",
      description: "Updated infrastructure description",
      icon: "server",
      color: "#1d4ed8",
    },
    "POST /api/infrastructures/{id}/tfstates": {
      version: 4,
      resources: [],
    },
    "POST /api/settings/export": {
      projects: ["infrastructure-id"],
    },
    "POST /api/settings/import": {
      projects: [
        {
          infrastructure: {
            name: "Imported project",
            description: "Imported from backup",
            icon: "server",
            color: "#1d4ed8",
            tfstate: {},
          },
          softwares: [],
          variables: [],
        },
      ],
    },
    "POST /api/softwares": {
      instance: "instance001.frontends.local",
      software: "catalog-software-id",
      size: "small",
      domain: "app.example.com",
      domain_alias: "",
      exposition: "public",
    },
    "PUT /api/softwares/{id}": {
      instance: "instance001.frontends.local",
      software: "catalog-software-id",
      size: "medium",
      domain: "app.example.com",
      domain_alias: "",
      exposition: "public",
    },
    "POST /api/softwares/{id}": {
      action: "start",
    },
    "POST /api/users": {
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      language: "en",
      password: "Password123",
      token: "",
      isdisabled: false,
      sa: false,
    },
    "PUT /api/users/{id}": {
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      language: "en",
      password: "Password123",
      token: "",
      sa: false,
      isdisabled: false,
      isinactive: false,
      notifications: true,
    },
    "PUT /api/users/profile": {
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      language: "en",
    },
    "PUT /api/users/password": {
      password: "NewPassword123",
    },
    "POST /api/variables": {
      type: "project",
      key: "my.project.example",
      value: "secret-value",
    },
    "PUT /api/variables/{id}": {
      type: "project",
      key: "my.project.example",
      value: "updated-secret-value",
    },
    "POST /api/variables/{id}": {
      mode: "read2",
      key2: "my_project_example",
    },
    "POST /api/variables/secret": {
      type: "project",
      key: "my.project.example",
      subkey: "password",
      missing: "warn",
      nosymbols: false,
      length: 24,
    },
  };

  return examples[key] ?? {};
}

function getResponseExample(path: string, method: HttpMethod, statusCode: string): unknown {
  const key = `${method.toUpperCase()} ${path} ${statusCode}`;

  const specificExamples: Record<string, unknown> = {
    "GET /api/ping 200": { ok: true },
    "GET /api/events 200": [{ type: "info", body: "15/03/2026 14:45:00 - Deployment completed" }],
    "POST /api/events 201": { ok: true },
    "GET /api/catalogs 200": [{ id: "catalog-id", name: "my_catalog", version: "1.0.0" }],
    "GET /api/infrastructures 200": [
      { id: "infra-id", name: "frontends-main", description: "Main infrastructure" },
    ],
    "GET /api/users 200": [
      { id: "user-id", first_name: "John", last_name: "Doe", email: "john.doe@example.com" },
    ],
    "GET /api/variables 200": [{ id: "var-id", type: "project", key: "my.project.example" }],
  };

  if (specificExamples[key]) {
    return specificExamples[key];
  }

  const code = Number(statusCode);
  if (code === 201) return { ok: true };
  if (code === 400) return { error: "Bad Request" };
  if (code === 401) return { error: "Unauthorized" };
  if (code === 403) return { error: "Forbidden" };
  if (code === 404) return { error: "Not found" };
  if (code >= 500) return { error: "Internal Server Error" };
  return { ok: true };
}

export default function ApiTester() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRouteKey, setSelectedRouteKey] = useState("");
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [payload, setPayload] = useState("{}");
  const [isLoadingSpec, setIsLoadingSpec] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [specError, setSpecError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [selectedExampleCode, setSelectedExampleCode] = useState("");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    let cancelled = false;

    const loadSpec = async () => {
      setIsLoadingSpec(true);
      setSpecError("");
      try {
        const res = await fetch("/api/openapi-internal", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!res.ok) {
          throw new Error(`Impossible de charger la spec (${res.status})`);
        }

        const doc = (await res.json()) as OpenApiDoc;
        const nextRoutes: RouteItem[] = [];

        for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
          for (const method of methodOrder) {
            const operation = pathItem?.[method];
            if (!operation) continue;

            const defaultSummary = `${method.toUpperCase()} ${path}`;
            const feature = (operation.tags?.[0] ?? "other").toLowerCase();
            nextRoutes.push({
              feature,
              path,
              method,
              summary: operation.summary ?? defaultSummary,
              needsBody: !!operation.requestBody,
              responseCodes: Object.keys(operation.responses ?? {}).sort(),
            });
          }
        }

        nextRoutes.sort((a, b) => {
          if (a.feature !== b.feature) {
            return a.feature.localeCompare(b.feature);
          }
          if (a.path === b.path) {
            return methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method);
          }
          return a.path.localeCompare(b.path);
        });

        if (cancelled) return;

        setRoutes(nextRoutes);
        if (nextRoutes.length > 0) {
          setSelectedRouteKey(`${nextRoutes[0].method} ${nextRoutes[0].path}`);
        }
      } catch (error) {
        if (!cancelled) {
          setSpecError(error instanceof Error ? error.message : "Erreur inconnue");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSpec(false);
        }
      }
    };

    loadSpec();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRoute = useMemo(() => {
    return routes.find((route) => `${route.method} ${route.path}` === selectedRouteKey) ?? null;
  }, [routes, selectedRouteKey]);

  const groupedRoutes = useMemo(() => {
    const groups = new Map<string, RouteItem[]>();
    for (const route of routes) {
      const existing = groups.get(route.feature) ?? [];
      existing.push(route);
      groups.set(route.feature, existing);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([feature, items]) => ({ feature, items }));
  }, [routes]);

  const selectedPathParamKeys = useMemo(() => {
    if (!selectedRoute) return [];
    return extractPathParams(selectedRoute.path);
  }, [selectedRoute]);

  const selectedExamplePayload = useMemo(() => {
    if (!selectedRoute) return "{}";
    return prettyPrint(JSON.stringify(getRequestExample(selectedRoute.path, selectedRoute.method)));
  }, [selectedRoute]);

  const selectedResponseExample = useMemo(() => {
    if (!selectedRoute || !selectedExampleCode) return "{}";
    return prettyPrint(
      JSON.stringify(getResponseExample(selectedRoute.path, selectedRoute.method, selectedExampleCode)),
    );
  }, [selectedRoute, selectedExampleCode]);

  useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const key of selectedPathParamKeys) {
      defaults[key] = pathParams[key] ?? "";
    }
    setPathParams(defaults);
    setRequestError("");
    setResponse(null);
    if (selectedRoute?.responseCodes?.length) {
      setSelectedExampleCode(selectedRoute.responseCodes[0]);
    } else {
      setSelectedExampleCode("200");
    }
    setPayload(selectedExamplePayload);
  }, [selectedPathParamKeys]);

  const finalUrl = useMemo(() => {
    if (!selectedRoute) return "";
    return buildPathFromTemplate(selectedRoute.path, pathParams);
  }, [selectedRoute, pathParams]);

  const canRun = !!selectedRoute && !isRunning;

  async function copyResponseToClipboard() {
    if (!response) return;

    try {
      await navigator.clipboard.writeText(response.bodyText || "(Reponse vide)");
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  }

  async function runRequest() {
    if (!selectedRoute) return;

    setRequestError("");
    setResponse(null);

    for (const key of selectedPathParamKeys) {
      if (!pathParams[key]?.trim()) {
        setRequestError(`Le parametre de chemin \"${key}\" est obligatoire.`);
        return;
      }
    }

    let parsedBody: unknown = undefined;
    if (selectedRoute.needsBody) {
      try {
        parsedBody = payload.trim() ? JSON.parse(payload) : {};
      } catch {
        setRequestError("Payload JSON invalide.");
        return;
      }
    }

    const headers: HeadersInit = {};
    if (selectedRoute.needsBody) {
      headers["Content-Type"] = "application/json";
    }

    setIsRunning(true);

    const startedAt = performance.now();
    try {
      const res = await fetch(finalUrl, {
        method: selectedRoute.method.toUpperCase(),
        headers,
        body: selectedRoute.needsBody ? JSON.stringify(parsedBody) : undefined,
        credentials: "same-origin",
        cache: "no-store",
      });

      const rawText = await res.text();
      const durationMs = Math.round(performance.now() - startedAt);

      setResponse({
        status: res.status,
        durationMs,
        contentType: res.headers.get("content-type") ?? "",
        bodyText: prettyPrint(rawText),
      });
      setCopyState("idle");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Echec de la requete");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="h-[calc(100vh-3rem)] min-h-[680px] space-y-4 md:flex md:gap-4 md:space-y-0">
      <aside className="max-md:hidden md:flex md:w-[360px] md:min-h-0 md:shrink-0 md:flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">Routes API disponibles</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Selectionne une route pour la tester.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {isLoadingSpec && <p className="p-2 text-sm text-zinc-500">Chargement...</p>}
          {specError && <p className="p-2 text-sm text-red-600">{specError}</p>}

          {!isLoadingSpec && !specError && routes.length === 0 && (
            <p className="p-2 text-sm text-zinc-500">Aucune route trouvee.</p>
          )}

          {!isLoadingSpec &&
            !specError &&
            groupedRoutes.map((group) => (
              <div key={group.feature} className="mb-3">
                <div className="mb-1 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {(() => {
                    const FeatureIcon = getFeatureIcon(group.feature);
                    return <FeatureIcon size={14} className="shrink-0" />;
                  })()}
                  <span>{toFeatureLabel(group.feature)}</span>
                </div>
                {group.items.map((route) => {
                  const key = `${route.method} ${route.path}`;
                  const active = key === selectedRouteKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedRouteKey(key)}
                      className={[
                        "mb-1 w-full rounded-md border px-3 py-2 text-left transition",
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{route.path}</p>
                        <span className={getMethodBadgeClass(route.method)}>
                          {route.method.toUpperCase()}
                        </span>
                      </div>
                      <p className="truncate text-xs opacity-80">{route.summary}</p>
                    </button>
                  );
                })}
              </div>
            ))}
        </div>
      </aside>

      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:flex-1">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h1 className="text-lg font-semibold">API interne</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Teste les endpoints directement avec ta session active.
          </p>
          <div className="mt-3 md:hidden">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Route
            </label>
            <select
              value={selectedRouteKey}
              onChange={(event) => setSelectedRouteKey(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {groupedRoutes.map((group) => (
                <optgroup key={group.feature} label={toFeatureLabel(group.feature)}>
                  {group.items.map((route) => {
                    const key = `${route.method} ${route.path}`;
                    return (
                      <option key={key} value={key}>
                        {`${route.method.toUpperCase()} ${route.path}`}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {!selectedRoute ? (
          <div className="p-4 text-sm text-zinc-500">Selectionne une route pour continuer.</div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-2">
            <div className="min-h-0 overflow-auto space-y-4">
              {selectedPathParamKeys.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Parametres de chemin
                  </p>
                  {selectedPathParamKeys.map((key) => (
                    <input
                      key={key}
                      value={pathParams[key] ?? ""}
                      onChange={(event) =>
                        setPathParams((prev) => ({
                          ...prev,
                          [key]: event.target.value,
                        }))
                      }
                      placeholder={key}
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  ))}
                </div>
              )}

              {selectedRoute.method !== "get" && (
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Payload JSON
                  </label>
                  <textarea
                    value={payload}
                    onChange={(event) => setPayload(event.target.value)}
                    rows={10}
                    spellCheck={false}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              )}

              {requestError && <p className="text-sm text-red-600">{requestError}</p>}

              <button
                type="button"
                onClick={runRequest}
                disabled={!canRun}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {isRunning ? "Execution..." : "Executer la requete"}
              </button>
            </div>

            <div className="min-h-0 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Exemples de reponse
                </p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {(selectedRoute.responseCodes.length
                    ? selectedRoute.responseCodes
                    : ["200", "401", "403", "500"]
                  ).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setSelectedExampleCode(code)}
                      className={[
                        "rounded-full px-2 py-1 text-xs font-semibold transition",
                        selectedExampleCode === code
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600",
                      ].join(" ")}
                    >
                      HTTP {code}
                    </button>
                  ))}
                </div>
                <pre className="mb-3 whitespace-pre-wrap break-words rounded-md border border-zinc-200 bg-white p-2 font-mono text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-950">
                  {selectedResponseExample}
                </pre>
              </div>

              <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Derniere reponse
                  </p>
                  {response && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={copyResponseToClipboard}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Copier le resultat
                      </button>
                      {copyState === "success" && (
                        <span className="text-xs text-emerald-600">Copie</span>
                      )}
                      {copyState === "error" && (
                        <span className="text-xs text-rose-600">Echec de copie</span>
                      )}
                    </div>
                  )}
                </div>
                {!response ? (
                  <p className="text-sm text-zinc-500">Aucune reponse executee pour le moment.</p>
                ) : (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className={getResponseStatusBadgeClass(response.status)}>
                        HTTP {response.status}
                      </span>
                      <span className="rounded-full bg-zinc-200 px-2 py-1 dark:bg-zinc-700">
                        {response.durationMs} ms
                      </span>
                      {response.contentType && (
                        <span className="rounded-full bg-zinc-200 px-2 py-1 dark:bg-zinc-700">
                          {response.contentType}
                        </span>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                      {response.bodyText || "(Reponse vide)"}
                    </pre>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
