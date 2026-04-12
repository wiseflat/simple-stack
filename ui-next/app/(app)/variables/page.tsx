"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import YAML from "yaml";
import { z } from "zod";
import ResourceShell from "@/components/ui/resource-shell";


type Variable = {
  id: string;
  uid: string | null;
  type: string;
  key: string;
  key2: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type EditorMode = "json" | "yaml";
type PageSizeMode = "auto" | "10" | "20" | "50";

// Integrity validation is now performed server-side via /api/variables/integrity
const TYPE_BADGE: Record<string, string> = {
  software:       "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
  secret:         "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300",
  project:        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300",
  settings:       "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300",
  tfstate:        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
  infrastructure: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300",
};

function typeBadge(type: string) {
  return TYPE_BADGE[type] ?? "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400";
}

// ------------------------------------------------------------------ Schemas
const VariableFormSchema = z.object({
  type:  z.string().min(1, "type required"),
  key:   z.string().min(1, "key required"),
  key2:  z.string().optional(),
  value: z.string(),
});

type VariableFormValues = {
  type: string;
  key: string;
  key2?: string;
  value: string;
};

// ------------------------------------------------------------------ Dialog
type VariableDialogProps = {
  mode: "create" | "edit";
  initialValues: VariableFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: VariableFormValues) => Promise<void>;
};

function VariableDialog({ mode, initialValues, saving, onCancel, onSubmit }: VariableDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<VariableFormValues>({
    resolver: zodResolver(VariableFormSchema),
    defaultValues: initialValues,
  });

  const [editorMode, setEditorMode] = useState<EditorMode>("yaml");
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    reset(initialValues);
    setEditorError(null);
  }, [initialValues, reset]);

  function validateContent(content: string, currentMode: EditorMode): boolean {
    try {
      if (!content.trim()) { setEditorError(null); return true; }
      if (currentMode === "json") {
        JSON.parse(content);
      } else {
        YAML.parse(content);
      }
      setEditorError(null);
      return true;
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Invalid content");
      return false;
    }
  }

  function toggleEditorMode(nextMode: EditorMode) {
    if (nextMode === editorMode) return;
    try {
      const current = getValues("value") ?? "";
      if (!current.trim()) { setEditorMode(nextMode); return; }
      if (nextMode === "yaml") {
        setValue("value", YAML.stringify(JSON.parse(current)), { shouldDirty: true });
      } else {
        setValue("value", JSON.stringify(YAML.parse(current) ?? {}, null, 2), { shouldDirty: true });
      }
      setEditorError(null);
      setEditorMode(nextMode);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Cannot convert content");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold">{mode === "create" ? "Create variable" : "Edit variable"}</h3>
            <p className="text-sm text-zinc-500">
              {mode === "create" ? "Add a new encrypted variable entry." : "Update the encrypted variable content."}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
            Close
          </button>
        </div>

        <form
          onSubmit={handleSubmit((values) => {
            if (!validateContent(values.value ?? "", editorMode)) return;
            return onSubmit(values as unknown as VariableFormValues);
          })}
          className="grid gap-4 p-6 md:grid-cols-2"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="software / secret / project / settings / tfstate"
              readOnly={mode === "edit"}
              {...register("type")}
            />
            {errors.type && <p className="text-xs text-red-600 dark:text-red-400">{errors.type.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Key</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="resource-id or name"
              readOnly={mode === "edit"}
              {...register("key")}
            />
            {errors.key && <p className="text-xs text-red-600 dark:text-red-400">{errors.key.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Key2 <span className="text-zinc-400 text-xs">(optional, defaults to key)</span></label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="secondary identifier"
              {...register("key2")}
            />
            {errors.key2 && <p className="text-xs text-red-600 dark:text-red-400">{errors.key2.message}</p>}
          </div>

          <div className="flex items-center gap-2 text-sm md:col-span-2">
            <span className="text-zinc-500">Format:</span>
            {(["yaml", "json"] as EditorMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={[
                  "rounded border px-2 py-1 uppercase text-xs",
                  editorMode === m
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 dark:border-zinc-700",
                ].join(" ")}
                onClick={() => toggleEditorMode(m)}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Value</label>
            <textarea
              className="min-h-48 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
              placeholder={editorMode === "json" ? '{"key": "value"}' : "key: value"}
              {...register("value")}
              onChange={(e) => {
                setValue("value", e.target.value, { shouldDirty: true });
                validateContent(e.target.value, editorMode);
              }}
            />
            {editorError && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">{editorError}</p>
            )}
          </div>

          <div className="flex items-end justify-end gap-3 md:col-span-2">
            <button type="button" onClick={onCancel} className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
              Cancel
            </button>
            <button
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : mode === "create" ? "Create variable" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Page
export default function VariablesPage() {
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<Variable | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [integrityMode, setIntegrityMode] = useState(false);
  const [orphanIds, setOrphanIds] = useState<Set<string>>(new Set());
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [selectedOrphans, setSelectedOrphans] = useState<Set<string>>(new Set());
  const [deletingOrphans, setDeletingOrphans] = useState(false);

  const [typeFilter, setTypeFilter] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [sortBy, setSortBy] = useState<"type" | "key" | "key2">("type");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [autoItemsPerPage, setAutoItemsPerPage] = useState(12);
  const [pageSizeMode, setPageSizeMode] = useState<PageSizeMode>("auto");

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/variables", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Variable[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load variables");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    function closeMenu() { setOpenMenuId(null); }
    if (!openMenuId) return;
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [openMenuId]);

  useEffect(() => { setCurrentPage(1); }, [typeFilter, keyFilter, sortBy, sortDirection]);
  useEffect(() => { setCurrentPage(1); }, [pageSizeMode]);

  useEffect(() => {
    function update() {
      const viewport = window.innerHeight;
      const rowHeight = 52;
      const paginationReserve = 138;
      const tableTop = tableWrapperRef.current?.getBoundingClientRect().top ?? 360;
      const available = Math.max(rowHeight * 5, viewport - tableTop - paginationReserve);
      setAutoItemsPerPage(Math.max(5, Math.floor(available / rowHeight)));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [error, loading, items.length]);

  const filteredItems = useMemo(() => {
    const nType = typeFilter.trim().toLowerCase();
    const nKey  = keyFilter.trim().toLowerCase();
    const list = items.filter((v) => {
      const tOk = !nType || v.type.toLowerCase().includes(nType);
      const kOk = !nKey  || v.key.toLowerCase().includes(nKey) || (v.key2 ?? "").toLowerCase().includes(nKey);
      const orphanOk = !integrityMode || orphanIds.has(v.id);
      return tOk && kOk && orphanOk;
    });
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const left  = sortBy === "type" ? a.type : sortBy === "key" ? a.key : (a.key2 ?? "");
      const right = sortBy === "type" ? b.type : sortBy === "key" ? b.key : (b.key2 ?? "");
      return left.localeCompare(right, undefined, { sensitivity: "base" }) * dir;
    });
  }, [items, typeFilter, keyFilter, sortBy, sortDirection, integrityMode, orphanIds]);

  const itemsPerPage = pageSizeMode === "auto" ? autoItemsPerPage : Number(pageSizeMode);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));

  useEffect(() => {
    const safePage = Math.min(currentPage, totalPages);
    if (safePage !== currentPage) setCurrentPage(safePage);
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [currentPage, filteredItems, itemsPerPage]);

  function onSort(column: "type" | "key" | "key2") {
    if (sortBy === column) { setSortDirection((p) => (p === "asc" ? "desc" : "asc")); return; }
    setSortBy(column);
    setSortDirection("asc");
  }

  function sortIndicator(column: "type" | "key" | "key2") {
    if (sortBy !== column) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  const formValues = useMemo<VariableFormValues>(() => {
    if (dialogMode === "edit" && editingItem) {
      return { type: editingItem.type, key: editingItem.key, key2: editingItem.key2 ?? "", value: editingValue };
    }
    return { type: "", key: "", key2: "", value: "" };
  }, [dialogMode, editingItem, editingValue]);

  async function openEdit(item: Variable) {
    setError(null);
    setOpenMenuId(null);
    try {
      const res = await fetch(
        `/api/variables/${item.id}?type=${encodeURIComponent(item.type)}&key=${encodeURIComponent(item.key)}&format=yaml`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const detail = (await res.json()) as { value: string | Record<string, unknown> };
      const yamlValue = typeof detail.value === "string" ? detail.value : YAML.stringify(detail.value ?? {});
      setEditingValue(yamlValue);
      setEditingItem(item);
      setDialogMode("edit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load variable");
    }
  }

  async function onCreate(values: VariableFormValues) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/variables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `HTTP ${res.status}`);
      setSaving(false);
      return;
    }
    setDialogMode(null);
    await load();
    setSaving(false);
  }

  async function onUpdate(values: VariableFormValues) {
    if (!editingItem) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/variables/${editingItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `HTTP ${res.status}`);
      setSaving(false);
      return;
    }
    setDialogMode(null);
    setEditingItem(null);
    setEditingValue("");
    await load();
    setSaving(false);
  }

  async function checkIntegrity() {
    setCheckingIntegrity(true);
    setError(null);
    try {
      const res = await fetch("/api/variables/integrity", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        orphans: Array<{ id: string; type: string; key: string; key2?: string; reason: string }>;
        counts: { total: number; orphans: number };
      };
      setOrphanIds(new Set(data.orphans.map((o) => o.id)));
      setIntegrityMode(true);
      setSelectedOrphans(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Integrity check failed");
    } finally {
      setCheckingIntegrity(false);
    }
  }

  function exitIntegrityMode() {
    setIntegrityMode(false);
    setOrphanIds(new Set());
    setSelectedOrphans(new Set());
  }

  async function deleteSelectedOrphans() {
    if (!confirm(`Delete ${selectedOrphans.size} orphaned variable(s)?`)) return;
    setDeletingOrphans(true);
    setError(null);
    for (const id of selectedOrphans) {
      const res = await fetch(`/api/variables/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `HTTP ${res.status}`);
        setDeletingOrphans(false);
        return;
      }
    }
    setDeletingOrphans(false);
    setSelectedOrphans(new Set());
    await load();
    // re-run integrity check on fresh data so view stays in sync
    setIntegrityMode(false);
    setOrphanIds(new Set());
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this variable?")) return;
    const res = await fetch(`/api/variables/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `HTTP ${res.status}`);
      return;
    }
    await load();
  }

  return (
    <ResourceShell
      title="Variables"
      subtitle="Manage encrypted variable and secret entries."
      loading={loading}
      error={error}
      stickyHeader
      actions={
        <div className="flex items-center gap-2">
          {integrityMode ? (
            <>
              <span className="rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                {orphanIds.size === 0 ? "No orphans found" : `${orphanIds.size} orphan${orphanIds.size !== 1 ? "s" : ""}`}
              </span>
              {selectedOrphans.size > 0 && (
                <button
                  type="button"
                  disabled={deletingOrphans}
                  className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
                  onClick={() => void deleteSelectedOrphans()}
                >
                  {deletingOrphans ? "Deleting..." : `Delete ${selectedOrphans.size} selected`}
                </button>
              )}
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
                onClick={exitIntegrityMode}
              >
                <X size={14} /> Show all
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={checkingIntegrity}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
              onClick={() => void checkIntegrity()}
            >
              <ShieldAlert size={14} />
              {checkingIntegrity ? "Checking..." : "Check integrity"}
            </button>
          )}
          <button
            type="button"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            onClick={() => {
              setEditingItem(null);
              setEditingValue("");
              setDialogMode("create");
            }}
          >
            Create variable
          </button>
        </div>
      }
    >
      <div ref={tableWrapperRef} className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-max min-w-full table-auto whitespace-nowrap text-sm">
          <thead className="bg-zinc-100 text-left dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">
                <button type="button" className="font-medium" onClick={() => onSort("type")}>
                  {`Type${sortIndicator("type")}`}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" className="font-medium" onClick={() => onSort("key")}>
                  {`Key${sortIndicator("key")}`}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" className="font-medium" onClick={() => onSort("key2")}>
                  {`Key2${sortIndicator("key2")}`}
                </button>
              </th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
            <tr className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
              <th className="px-3 py-2">
                <input
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  placeholder="Filter type"
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                />
              </th>
              <th className="px-3 py-2" colSpan={2}>
                <input
                  value={keyFilter}
                  onChange={(e) => setKeyFilter(e.target.value)}
                  placeholder="Filter key / key2"
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                />
              </th>
              <th className="px-3 py-2" />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((item) => (
              <tr key={item.id} className={`border-t border-zinc-200 dark:border-zinc-800 ${integrityMode && orphanIds.has(item.id) ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
                <td className="px-3 py-2">
                  {integrityMode && (
                    <input
                      type="checkbox"
                      className="mr-2 align-middle"
                      checked={selectedOrphans.has(item.id)}
                      onChange={(e) => {
                        setSelectedOrphans((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(item.id); else next.delete(item.id);
                          return next;
                        });
                      }}
                    />
                  )}
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${typeBadge(item.type)}`}>
                    {item.type}
                  </span>
                  {integrityMode && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                      <ShieldAlert size={10} /> orphan
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 max-w-xs truncate font-mono text-xs">{item.key}</td>
                <td className="px-3 py-2 max-w-xs truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{item.key2 ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 text-xs">
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "-"}
                </td>
                <td className="px-3 py-2">
                  <div className="relative inline-flex">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded border border-zinc-300 dark:border-zinc-700"
                      aria-label="Open actions menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId((cur) => (cur === item.id ? null : item.id));
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {openMenuId === item.id && (
                      <div
                        className="absolute right-0 top-full z-10 mt-2 min-w-36 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          onClick={() => void openEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="flex w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => {
                            setOpenMenuId(null);
                            void onDelete(item.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filteredItems.length && !loading && (
              <tr>
                <td className="px-3 py-3 text-zinc-500" colSpan={5}>
                  No variables match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-zinc-600 dark:text-zinc-300">
            {`Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredItems.length)} of ${filteredItems.length}`}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="text-zinc-600 dark:text-zinc-300" htmlFor="variables-page-size">Items/page</label>
            <select
              id="variables-page-size"
              value={pageSizeMode}
              onChange={(e) => setPageSizeMode(e.target.value as PageSizeMode)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="auto">auto</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <span className="whitespace-nowrap text-zinc-600 dark:text-zinc-300">{`Page ${currentPage} / ${totalPages}`}</span>
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {dialogMode && (
        <VariableDialog
          mode={dialogMode}
          initialValues={formValues}
          saving={saving}
          onCancel={() => {
            setDialogMode(null);
            setEditingItem(null);
            setEditingValue("");
          }}
          onSubmit={async (values) => {
            if (dialogMode === "create") return onCreate(values);
            return onUpdate(values);
          }}
        />
      )}
    </ResourceShell>
  );
}
