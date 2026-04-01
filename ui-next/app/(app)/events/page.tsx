"use client";

import { useEffect, useState } from "react";
import ResourceShell from "@/components/ui/resource-shell";

type EventLine = {
  type: string;
  body: string;
};

export default function EventsPage() {
  const [items, setItems] = useState<EventLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/events", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as EventLine[];
      setItems(json ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void load();
    }, 5000);
    return () => clearInterval(id);
  }, []);

  async function clearAll() {
    if (!confirm("Clear all events?")) return;
    const res = await fetch("/api/events", { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `HTTP ${res.status}`);
      return;
    }
    await load();
  }

  return (
    <ResourceShell
      title="Events"
      subtitle="Ansible execution log (auto-refresh every 5s)."
      loading={loading}
      error={error}
      stickyHeader
      actions={<button className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700" onClick={() => void clearAll()}>Clear</button>}
    >
      <div className="max-h-[70vh] overflow-auto rounded-lg border border-zinc-200 bg-black p-3 font-mono text-xs dark:border-zinc-800">
        {items.map((line, index) => (
          <p key={`${line.body}-${index}`} className={line.type === "warning" ? "text-amber-300" : "text-emerald-300"}>
            {line.body}
          </p>
        ))}
        {!items.length && !loading && <p className="text-zinc-400">No events yet.</p>}
      </div>
    </ResourceShell>
  );
}
