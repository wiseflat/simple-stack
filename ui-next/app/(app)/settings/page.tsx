"use client";

import { FormEvent, useEffect, useState } from "react";
import ResourceShell from "@/components/ui/resource-shell";

type GeneralSettings = {
  enablePublicLanding: boolean;
  enableDocumentation: boolean;
};

export default function SettingsPage() {
  const [tab, setTab] = useState<"general" | "export" | "import">("general");
  const [projectIds, setProjectIds] = useState("");
  const [importJson, setImportJson] = useState("[]");
  const [exportJson, setExportJson] = useState("");
  const [general, setGeneral] = useState<GeneralSettings>({
    enablePublicLanding: true,
    enableDocumentation: true,
  });
  const [generalLoaded, setGeneralLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGeneral() {
      if (generalLoaded || tab !== "general") return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/settings/general", { cache: "no-store" });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        const data = (await res.json()) as GeneralSettings;
        setGeneral({
          enablePublicLanding: !!data.enablePublicLanding,
          enableDocumentation: !!data.enableDocumentation,
        });
        setGeneralLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load general settings");
      } finally {
        setLoading(false);
      }
    }

    void loadGeneral();
  }, [generalLoaded, tab]);

  async function onSaveGeneral(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/settings/general", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(general),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as GeneralSettings;
      setGeneral({
        enablePublicLanding: !!data.enablePublicLanding,
        enableDocumentation: !!data.enableDocumentation,
      });
      setGeneralLoaded(true);
      window.dispatchEvent(new Event("site-settings-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save general settings");
    } finally {
      setLoading(false);
    }
  }

  async function onExport(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const projects = projectIds
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      const res = await fetch("/api/settings/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const json = await res.json();
      setExportJson(JSON.stringify(json, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export settings");
    } finally {
      setLoading(false);
    }
  }

  async function onImport(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const parsed = JSON.parse(importJson);
      const projects = Array.isArray(parsed) ? parsed : [];

      const res = await fetch("/api/settings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to import settings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResourceShell
      title="Settings"
      subtitle="Backup import/export (JSON payload)."
      loading={loading}
      error={error}
      stickyHeader
      headerExtra={
        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <button
            className={`px-4 py-2 text-sm font-medium ${tab === "general" ? "border-b-2 border-zinc-900 dark:border-zinc-100" : "text-zinc-500"}`}
            onClick={() => setTab("general")}
            type="button"
          >
            General
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${tab === "export" ? "border-b-2 border-zinc-900 dark:border-zinc-100" : "text-zinc-500"}`}
            onClick={() => setTab("export")}
            type="button"
          >
            Export
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${tab === "import" ? "border-b-2 border-zinc-900 dark:border-zinc-100" : "text-zinc-500"}`}
            onClick={() => setTab("import")}
            type="button"
          >
            Import
          </button>
        </div>
      }
    >

      {tab === "general" && (
        <form onSubmit={onSaveGeneral} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-medium">General</h3>

          <label className="flex items-start gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <input
              type="checkbox"
              checked={general.enablePublicLanding}
              onChange={(e) => setGeneral((prev) => ({ ...prev, enablePublicLanding: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm">
              <span className="block font-medium">Enable public landing page</span>
              <span className="block text-zinc-500">If disabled, requests to the public home page are redirected to login (or dashboard for authenticated users).</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <input
              type="checkbox"
              checked={general.enableDocumentation}
              onChange={(e) => setGeneral((prev) => ({ ...prev, enableDocumentation: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm">
              <span className="block font-medium">Enable public documentation</span>
              <span className="block text-zinc-500">If disabled, all /docs routes are redirected to login (or dashboard for authenticated users).</span>
            </span>
          </label>

          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900" type="submit">
            Save
          </button>
        </form>
      )}

      {tab === "export" && (
        <form onSubmit={onExport} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-medium">Export</h3>
          <input
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Infrastructure IDs separated by commas"
            value={projectIds}
            onChange={(e) => setProjectIds(e.target.value)}
          />
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900" type="submit">
            Export
          </button>
          <textarea
            className="min-h-56 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Export output"
            value={exportJson}
            onChange={(e) => setExportJson(e.target.value)}
          />
        </form>
      )}

      {tab === "import" && (
        <form onSubmit={onImport} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-medium">Import</h3>
          <textarea
            className="min-h-56 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Paste projects JSON"
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
          />
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900" type="submit">
            Import
          </button>
        </form>
      )}
    </ResourceShell>
  );
}
