"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, MoreHorizontal, Play, RefreshCw, ShieldAlert, Square, Trash2, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import YAML from "yaml";
import { z } from "zod";
import ResourceShell from "@/components/ui/resource-shell";
import { SoftwareCreateSchema, SoftwareUpdateSchema } from "@/lib/validations/software";

type Software = {
  id: string;
  instance: string | null;
  domain: string | null;
  domainAlias: string | null;
  exposition: string | null;
  version: string | null;
  size: string | null;
  softwareId: string | null;
  software: { name: string | null; version: string | null } | null;
  vid?: string | null;
  sid?: string | null;
};

type CatalogOption = {
  id: string;
  name: string;
};

type InstanceOption = {
  key: string;
  infrastructureName: string;
};

type Variable = {
  id: string;
  type: string;
  key: string;
  key2?: string;
  value?: string;
};

type Operation = {
  action: "start" | "stop" | "main" | "backup" | "restore" | "destroy" | "destroy_force";
  name: string;
  comment: string;
};

type SoftwareVariableType = "software" | "secret" | "settings";
type EditorMode = "json" | "yaml";
type PageSizeMode = "auto" | "10" | "20" | "50";

function OperationIcon({ action }: { action: Operation["action"] }) {
  const className = "h-4 w-4";

  if (action === "start") return <Play className={className} />;
  if (action === "stop") return <Square className={className} />;
  if (action === "main") return <RefreshCw className={className} />;
  if (action === "backup") return <Download className={className} />;
  if (action === "restore") return <Upload className={className} />;
  if (action === "destroy") return <Trash2 className={className} />;
  return <ShieldAlert className={className} />;
}

const VariableFormSchema = z.object({
  type: z.string().min(1, "type required"),
  key: z.string().min(1, "key required"),
  key2: z.string().min(1, "key2 required"),
  value: z.string(),
});
type VariableFormValues = z.infer<typeof VariableFormSchema>;

const sizeOptions = ["tiny", "small", "medium", "large", "xxl"] as const;
const expositionOptions = ["none", "public", "public-unmanaged", "private"] as const;

const softwareCreateFormSchema = SoftwareCreateSchema;
const softwareUpdateFormSchema = SoftwareUpdateSchema;

type SoftwareCreateFormValues = z.infer<typeof softwareCreateFormSchema>;
type SoftwareUpdateFormValues = z.infer<typeof softwareUpdateFormSchema>;

const emptyCreate: SoftwareCreateFormValues = {
  instance: "",
  software: "",
  size: "small",
  domain: "",
  domain_alias: "",
  exposition: "public",
};

type SoftwareDialogProps = {
  mode: "create" | "edit";
  initialValues: SoftwareCreateFormValues | SoftwareUpdateFormValues;
  catalogs: CatalogOption[];
  instances: InstanceOption[];
  instancesLoading: boolean;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: SoftwareCreateFormValues | SoftwareUpdateFormValues) => Promise<void>;
};

function SoftwareDialog({ mode, initialValues, catalogs, instances, instancesLoading, saving, onCancel, onSubmit }: SoftwareDialogProps) {
  const schema = mode === "create" ? softwareCreateFormSchema : softwareUpdateFormSchema;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SoftwareCreateFormValues | SoftwareUpdateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold">
              {mode === "create" ? "Create software" : "Edit software"}
            </h3>
            <p className="text-sm text-zinc-500">
              {mode === "create"
                ? "Attach a software catalog to an infrastructure instance."
                : "Update the selected software deployment."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit((values) => void onSubmit(values))} className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Instance</label>
            <select
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              disabled={instancesLoading || mode === "edit"}
              {...register("instance")}
            >
              <option value="">{instancesLoading ? "Loading…" : "Select an instance"}</option>
              {Object.entries(
                instances.reduce<Record<string, InstanceOption[]>>((acc, opt) => {
                  (acc[opt.infrastructureName] ??= []).push(opt);
                  return acc;
                }, {}),
              ).map(([infraName, opts]) => (
                <optgroup key={infraName} label={infraName}>
                  {opts.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.key}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.instance && <p className="text-xs text-red-600 dark:text-red-400">{errors.instance.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Catalog</label>
            <select
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              disabled={mode === "edit"}
              {...register("software")}
            >
              <option value="">Select a catalog</option>
              {catalogs.map((catalog) => (
                <option key={catalog.id} value={catalog.id}>{catalog.name}</option>
              ))}
            </select>
            {errors.software && <p className="text-xs text-red-600 dark:text-red-400">{errors.software.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Size</label>
            <select
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("size")}
            >
              {sizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            {errors.size && <p className="text-xs text-red-600 dark:text-red-400">{errors.size.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Exposition</label>
            <select
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("exposition")}
            >
              {expositionOptions.map((exposition) => (
                <option key={exposition} value={exposition}>{exposition}</option>
              ))}
            </select>
            {errors.exposition && <p className="text-xs text-red-600 dark:text-red-400">{errors.exposition.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Domain</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="app.example.com"
              readOnly={mode === "edit"}
              {...register("domain")}
            />
            {errors.domain && <p className="text-xs text-red-600 dark:text-red-400">{errors.domain.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Domain alias</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="alias.example.com"
              {...register("domain_alias")}
            />
            {errors.domain_alias && <p className="text-xs text-red-600 dark:text-red-400">{errors.domain_alias.message}</p>}
          </div>

          <div className="flex items-end justify-end gap-3 md:col-span-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : mode === "create" ? "Create software" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type VariableDialogProps = {
  mode: "create" | "edit";
  softwareDomain: string;
  variableType: SoftwareVariableType;
  initialValues: VariableFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: VariableFormValues) => Promise<void>;
};

function VariableDialog({ mode, softwareDomain, variableType, initialValues, saving, onCancel, onSubmit }: VariableDialogProps) {
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = useForm<VariableFormValues>({
    resolver: zodResolver(VariableFormSchema),
    defaultValues: initialValues,
  });
  const [editorMode, setEditorMode] = useState<EditorMode>(mode === "edit" ? "yaml" : "json");
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    reset(initialValues);
    setEditorMode(mode === "edit" ? "yaml" : "json");
    setEditorError(null);
  }, [initialValues, mode, reset]);

  function validateEditorContent(content: string, currentMode: EditorMode) {
    try {
      if (!content.trim()) {
        setEditorError(null);
        return true;
      }

      if (currentMode === "json") {
        JSON.parse(content);
      } else {
        YAML.parse(content);
      }

      setEditorError(null);
      return true;
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Invalid content format");
      return false;
    }
  }

  function onToggleEditorMode(nextMode: EditorMode) {
    if (nextMode === editorMode) return;

    try {
      const currentValue = getValues("value") ?? "";
      if (!currentValue.trim()) {
        setEditorMode(nextMode);
        return;
      }

      if (nextMode === "yaml") {
        const parsed = JSON.parse(currentValue);
        setValue("value", YAML.stringify(parsed), { shouldDirty: true });
      } else {
        const parsed = YAML.parse(currentValue);
        setValue("value", JSON.stringify(parsed ?? {}, null, 2), { shouldDirty: true });
      }

      setEditorError(null);
      setEditorMode(nextMode);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Cannot convert content");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold">{mode === "create" ? "Create variable set" : "Edit variable set"}</h3>
            <p className="text-sm text-zinc-500">
              {mode === "create"
                ? `Create ${variableType} variables for ${softwareDomain}.`
                : `Update ${variableType} variables for ${softwareDomain}.`}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
            Close
          </button>
        </div>

        <form
          onSubmit={handleSubmit((values) => {
            if (!validateEditorContent(values.value ?? "", editorMode)) return;
            return onSubmit(values);
          })}
          className="grid gap-4 p-6 md:grid-cols-2"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              readOnly
              {...register("type")}
            />
            {errors.type && <p className="text-xs text-red-600 dark:text-red-400">{errors.type.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Key</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              readOnly
              {...register("key")}
            />
            {errors.key && <p className="text-xs text-red-600 dark:text-red-400">{errors.key.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Key2</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              readOnly
              {...register("key2")}
            />
            {errors.key2 && <p className="text-xs text-red-600 dark:text-red-400">{errors.key2.message}</p>}
          </div>

          <div className="flex items-center gap-2 text-sm md:col-span-2">
            <span className="text-zinc-500">Editor format:</span>
            <button
              type="button"
              className={[
                "rounded border px-2 py-1",
                editorMode === "json"
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 dark:border-zinc-700",
              ].join(" ")}
              onClick={() => onToggleEditorMode("json")}
            >
              JSON
            </button>
            <button
              type="button"
              className={[
                "rounded border px-2 py-1",
                editorMode === "yaml"
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 dark:border-zinc-700",
              ].join(" ")}
              onClick={() => onToggleEditorMode("yaml")}
            >
              YAML
            </button>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Content</label>
            <textarea
              className="min-h-56 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
              placeholder={editorMode === "json" ? "JSON content" : "YAML content"}
              {...register("value")}
              onChange={(event) => {
                setValue("value", event.target.value, { shouldDirty: true });
                validateEditorContent(event.target.value, editorMode);
              }}
            />
            {errors.value && <p className="text-xs text-red-600 dark:text-red-400">{errors.value.message}</p>}
            {editorError && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">{editorError}</p>}
          </div>

          <div className="flex items-end justify-end gap-3 md:col-span-2">
            <button type="button" onClick={onCancel} className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
              Cancel
            </button>
            <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900" type="submit" disabled={saving}>
              {saving ? "Saving..." : mode === "create" ? "Create variable set" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SoftwaresPage() {
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<Software[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [catalogs, setCatalogs] = useState<CatalogOption[]>([]);
  const [instances, setInstances] = useState<InstanceOption[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<Software | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [variableDialogMode, setVariableDialogMode] = useState<"create" | "edit" | null>(null);
  const [variableSaving, setVariableSaving] = useState(false);
  const [variableType, setVariableType] = useState<SoftwareVariableType>("software");
  const [variableSoftware, setVariableSoftware] = useState<Software | null>(null);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openOperationsMenuId, setOpenOperationsMenuId] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [instanceFilter, setInstanceFilter] = useState("");
  const [sortBy, setSortBy] = useState<"catalog" | "domain" | "instance">("catalog");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [autoItemsPerPage, setAutoItemsPerPage] = useState(12);
  const [pageSizeMode, setPageSizeMode] = useState<PageSizeMode>("auto");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executingOperation, setExecutingOperation] = useState<string | null>(null);

  const operations: Operation[] = [
    { action: "start", name: "Start", comment: "Do you want to start selected items ?" },
    { action: "stop", name: "Stop", comment: "Do you want to stop selected items ?" },
    { action: "main", name: "(Re) deploy", comment: "Do you want to upgrade selected items ?" },
    { action: "backup", name: "Backup", comment: "Do you want to backup selected items ?" },
    { action: "restore", name: "Restore", comment: "Do you want to restore selected items ?" },
    { action: "destroy", name: "Destroy", comment: "Do you want to destroy permanently selected items ?" },
    {
      action: "destroy_force",
      name: "Destroy (force)",
      comment: "Do you want to force destroy permanently selected items ?",
    },
  ];

  const filteredItems = useMemo(() => {
    const normalizedCatalog = catalogFilter.trim().toLowerCase();
    const normalizedDomain = domainFilter.trim().toLowerCase();
    const normalizedInstance = instanceFilter.trim().toLowerCase();

    const list = items.filter((item) => {
      const catalogValue = (item.software?.name ?? item.softwareId ?? "").toLowerCase();
      const domainValue = (item.domain ?? "").toLowerCase();
      const instanceValue = (item.instance ?? "").toLowerCase();

      const catalogOk = !normalizedCatalog || catalogValue.includes(normalizedCatalog);
      const domainOk = !normalizedDomain || domainValue.includes(normalizedDomain);
      const instanceOk = !normalizedInstance || instanceValue.includes(normalizedInstance);

      return catalogOk && domainOk && instanceOk;
    });

    const direction = sortDirection === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      const left =
        sortBy === "catalog"
          ? (a.software?.name ?? a.softwareId ?? "")
          : sortBy === "domain"
            ? (a.domain ?? "")
            : (a.instance ?? "");
      const right =
        sortBy === "catalog"
          ? (b.software?.name ?? b.softwareId ?? "")
          : sortBy === "domain"
            ? (b.domain ?? "")
            : (b.instance ?? "");
      return left.localeCompare(right, undefined, { sensitivity: "base" }) * direction;
    });

    return sorted;
  }, [catalogFilter, domainFilter, instanceFilter, items, sortBy, sortDirection]);

  const itemsPerPage =
    pageSizeMode === "auto" ? autoItemsPerPage : Number(pageSizeMode);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [currentPage, filteredItems, itemsPerPage]);

  function onSort(column: "catalog" | "domain" | "instance") {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
  }

  function sortIndicator(column: "catalog" | "domain" | "instance") {
    if (sortBy !== column) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  const formValues = useMemo<SoftwareCreateFormValues | SoftwareUpdateFormValues>(() => {
    if (dialogMode === "edit" && editingItem) {
      return {
        instance: editingItem.instance ?? "",
        software: editingItem.softwareId ?? "",
        size: (editingItem.size as SoftwareUpdateFormValues["size"]) ?? "small",
        domain: editingItem.domain ?? "",
        domain_alias: editingItem.domainAlias ?? "",
        exposition: (editingItem.exposition as SoftwareUpdateFormValues["exposition"]) ?? "public",
      };
    }

    return emptyCreate;
  }, [dialogMode, editingItem]);

  const variableFormValues = useMemo<VariableFormValues>(() => {
    if (variableDialogMode === "edit" && editingVariable) {
      return {
        type: editingVariable.type,
        key: editingVariable.key,
        key2: editingVariable.key2 ?? variableSoftware?.domain ?? "",
        value: editingVariable.value ?? "{}",
      };
    }

    return {
      type: variableType,
      key: variableSoftware?.id ?? "",
      key2: variableSoftware?.domain ?? "",
      value: "{}",
    };
  }, [editingVariable, variableDialogMode, variableSoftware, variableType]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [softwaresRes, catalogsRes] = await Promise.all([
        fetch("/api/softwares", { cache: "no-store" }),
        fetch("/api/catalogs", { cache: "no-store" }),
      ]);
      if (!softwaresRes.ok) throw new Error(`HTTP ${softwaresRes.status}`);
      if (!catalogsRes.ok) throw new Error(`HTTP ${catalogsRes.status}`);
      const softwaresJson = (await softwaresRes.json()) as { items: Software[] };
      const catalogsJson = (await catalogsRes.json()) as { items: Array<{ id: string; name: string }> };
      setItems(softwaresJson.items ?? []);
      setCatalogs((catalogsJson.items ?? []).map((item) => ({ id: item.id, name: item.name })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load softwares");
    } finally {
      setLoading(false);
    }
  }

  async function loadInstances() {
    try {
      setInstancesLoading(true);
      const res = await fetch("/api/graphs", { cache: "no-store" });
      if (!res.ok) return;
      const graph = (await res.json()) as { nodes: Array<{ key: string; collection: string; infrastructureName?: string }> };
      setInstances(
        graph.nodes
          .filter((n) => n.collection === "instance")
          .map((n) => ({ key: n.key, infrastructureName: n.infrastructureName ?? n.key }))
          .sort((a, b) => a.infrastructureName.localeCompare(b.infrastructureName) || a.key.localeCompare(b.key)),
      );
    } finally {
      setInstancesLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void loadInstances();
  }, []);

  useEffect(() => {
    function closeMenu() {
      setOpenMenuId(null);
      setOpenOperationsMenuId(false);
    }

    if (!openMenuId && !openOperationsMenuId) return;

    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [openMenuId, openOperationsMenuId]);

  useEffect(() => {
    const safePage = Math.min(currentPage, totalPages);
    if (safePage !== currentPage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [catalogFilter, domainFilter, instanceFilter, sortBy, sortDirection]);

  useEffect(() => {
    function updateItemsPerPage() {
      const viewport = window.innerHeight;
      const rowHeight = 52;
      const paginationReserve = 138;
      const tableTop = tableWrapperRef.current?.getBoundingClientRect().top ?? 360;
      const availableForRows = Math.max(rowHeight * 5, viewport - tableTop - paginationReserve);
      const computed = Math.max(5, Math.floor(availableForRows / rowHeight));
      setAutoItemsPerPage(computed);
    }

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, [error, loading, items.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSizeMode]);

  function toggleSelectAll() {
    const visibleIds = paginatedItems.map((item) => item.id);
    if (!visibleIds.length) return;

    const allVisibleSelected = visibleIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);

    if (allVisibleSelected) {
      for (const id of visibleIds) next.delete(id);
    } else {
      for (const id of visibleIds) next.add(id);
    }

    setSelectedIds(next);
  }

  function toggleSelectId(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  async function executeOperation(operation: Operation) {
    if (selectedIds.size === 0) return;
    if (!confirm(operation.comment)) return;

    setExecutingOperation(operation.action);
    setOpenOperationsMenuId(false);
    setError(null);

    try {
      for (const id of Array.from(selectedIds)) {
        const res = await fetch(`/api/softwares/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: operation.action }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to execute ${operation.name}`);
    } finally {
      setExecutingOperation(null);
    }
  }

  async function onCreate(values: SoftwareCreateFormValues) {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/softwares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setSaving(false);
      setError(data.error ?? `HTTP ${res.status}`);
      return;
    }

    setDialogMode(null);
    await load();
    setSaving(false);
  }

  async function onUpdate(values: SoftwareUpdateFormValues) {
    if (!editingItem) return;

    setSaving(true);
    setError(null);

    const res = await fetch(`/api/softwares/${editingItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setSaving(false);
      setError(data.error ?? `HTTP ${res.status}`);
      return;
    }

    setDialogMode(null);
    setEditingItem(null);
    await load();
    setSaving(false);
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this software?")) return;
    const res = await fetch(`/api/softwares/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `HTTP ${res.status}`);
      return;
    }
    await load();
  }

  async function openVariableDialog(item: Software, selectedType: SoftwareVariableType) {
    if (!item.domain) {
      setError("Cannot manage variables for this software because domain is missing.");
      setOpenMenuId(null);
      return;
    }

    setError(null);
    setOpenMenuId(null);
    setVariableType(selectedType);
    setVariableSoftware(item);

    try {
      const listRes = await fetch(
        `/api/variables?type=${encodeURIComponent(selectedType)}&key=${encodeURIComponent(item.id)}&key2=${encodeURIComponent(item.domain)}`,
        { cache: "no-store" },
      );
      if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);

      const matches = (await listRes.json()) as Variable[];
      const existingVariable = matches[0];

      if (!existingVariable) {
        setEditingVariable(null);
        setVariableDialogMode("create");
        return;
      }

      const detailRes = await fetch(
        `/api/variables/${existingVariable.id}?key=${encodeURIComponent(item.id)}&key2=${encodeURIComponent(item.domain)}&type=${encodeURIComponent(selectedType)}&format=yaml`,
        { cache: "no-store" },
      );
      if (!detailRes.ok) throw new Error(`HTTP ${detailRes.status}`);

      const detail = (await detailRes.json()) as { id: string; key: string; key2?: string; type: string; value: string | Record<string, unknown> };
      setEditingVariable({
        id: detail.id,
        key: detail.key,
        key2: detail.key2 ?? item.domain,
        type: detail.type,
        value: typeof detail.value === "string" ? detail.value : YAML.stringify(detail.value ?? {}),
      });
      setVariableDialogMode("edit");
    } catch (err) {
      setVariableType("software");
      setVariableSoftware(null);
      setEditingVariable(null);
      setVariableDialogMode(null);
      setError(err instanceof Error ? err.message : "Unable to load software variable");
    }
  }

  async function onVariableSubmit(values: VariableFormValues) {
    const endpoint = variableDialogMode === "edit" && editingVariable
      ? `/api/variables/${editingVariable.id}`
      : "/api/variables";
    const method = variableDialogMode === "edit" ? "PUT" : "POST";

    setVariableSaving(true);
    setError(null);

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setVariableDialogMode(null);
      setVariableType("software");
      setVariableSoftware(null);
      setEditingVariable(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save software variable");
    } finally {
      setVariableSaving(false);
    }
  }

  return (
    <ResourceShell
      title="Softwares"
      subtitle="Attach software catalogs to infrastructure instances."
      loading={loading}
      error={error}
      stickyHeader
      actions={
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              disabled={selectedIds.size === 0 || executingOperation !== null}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
              onClick={(event) => {
                event.stopPropagation();
                setOpenOperationsMenuId((prev) => !prev);
              }}
            >
              Operations
            </button>

            {openOperationsMenuId && selectedIds.size > 0 && (
              <div
                className="absolute left-0 top-full z-10 mt-2 min-w-56 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
                onClick={(event) => event.stopPropagation()}
              >
                {operations.map((operation, index) => (
                  <div key={operation.action}>
                    {index === 5 ? <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" /> : null}
                    <button
                      type="button"
                      disabled={executingOperation !== null}
                      className={[
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-900",
                        operation.action === "destroy" || operation.action === "destroy_force" ? "text-red-600" : "",
                      ]
                        .join(" ")
                        .trim()}
                      onClick={() => {
                        void executeOperation(operation);
                      }}
                    >
                      {executingOperation === operation.action ? (
                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
                      ) : (
                        <OperationIcon action={operation.action} />
                      )}
                      <span>{operation.name}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            onClick={() => {
              void openVariableDialog(
                {
                  id: "softwares",
                  instance: null,
                  domain: "softwares",
                  domainAlias: null,
                  exposition: null,
                  version: null,
                  size: null,
                  softwareId: null,
                  software: null,
                },
                "settings",
              );
            }}
          >
            Runner
          </button>

          <button
            type="button"
            className="mr-1 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            onClick={() => {
              setEditingItem(null);
              setDialogMode("create");
            }}
          >
            Create software
          </button>
        </div>
      }
    >
      <div ref={tableWrapperRef} className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-max min-w-full table-auto whitespace-nowrap text-sm">
          <thead className="bg-zinc-100 text-left dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 w-12">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                  checked={
                    paginatedItems.length > 0 &&
                    paginatedItems.every((item) => selectedIds.has(item.id))
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-3 py-2">
                <button type="button" className="font-medium" onClick={() => onSort("catalog")}>
                  {`Catalog${sortIndicator("catalog")}`}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" className="font-medium" onClick={() => onSort("domain")}>
                  {`Domain${sortIndicator("domain")}`}
                </button>
              </th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">
                <button type="button" className="font-medium" onClick={() => onSort("instance")}>
                  {`Instance${sortIndicator("instance")}`}
                </button>
              </th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
            <tr className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
              <th className="px-3 py-2 w-12" />
              <th className="px-3 py-2">
                <input
                  value={catalogFilter}
                  onChange={(event) => setCatalogFilter(event.target.value)}
                  placeholder="Filter catalog"
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                />
              </th>
              <th className="px-3 py-2">
                <input
                  value={domainFilter}
                  onChange={(event) => setDomainFilter(event.target.value)}
                  placeholder="Filter domain"
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                />
              </th>
              <th className="px-3 py-2" />
              <th className="px-3 py-2">
                <input
                  value={instanceFilter}
                  onChange={(event) => setInstanceFilter(event.target.value)}
                  placeholder="Filter instance"
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                />
              </th>
              <th className="px-3 py-2" />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((item) => (
              <tr key={item.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2 w-12">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelectId(item.id)}
                  />
                </td>
                <td className="px-3 py-2">{item.software?.name ?? item.softwareId ?? "-"}</td>
                <td className="px-3 py-2">
                  {item.exposition === "public" && item.domain ? (
                    <a
                      href={item.domain.startsWith("http://") || item.domain.startsWith("https://") ? item.domain : `https://${item.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {item.domain}
                    </a>
                  ) : (
                    item.domain
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span
                      className={[
                        "rounded-full border px-2 py-0.5 text-[11px]",
                        !!item.vid
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
                      ].join(" ")}
                    >
                      Var
                    </span>
                    <span
                      className={[
                        "rounded-full border px-2 py-0.5 text-[11px]",
                        !!item.sid
                          ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300"
                          : "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
                      ].join(" ")}
                    >
                      Sec
                    </span>
                    <span
                      className={[
                        "rounded-full border px-2 py-0.5 text-[11px] cursor-help",
                        item.version && item.software?.version && item.version === item.software.version
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
                      ].join(" ")}
                      title={`Deployed: ${item.version ?? "unknown"} | Catalog: ${item.software?.version ?? "unknown"}`}
                    >
                      {item.version ?? "unknown"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">{item.instance}</td>
                <td className="px-3 py-2">{item.size}</td>
                <td className="px-3 py-2">
                  <div className="relative inline-flex">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded border border-zinc-300 dark:border-zinc-700"
                      aria-label="Open actions menu"
                      aria-expanded={openMenuId === item.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId((current) => (current === item.id ? null : item.id));
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {openMenuId === item.id && (
                      <div
                        className="absolute right-0 top-full z-10 mt-2 min-w-40 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          onClick={() => {
                            void openVariableDialog(item, "software");
                          }}
                        >
                          Variables
                        </button>
                        <button
                          type="button"
                          className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          onClick={() => {
                            void openVariableDialog(item, "secret");
                          }}
                        >
                          Secrets
                        </button>
                        <button
                          type="button"
                          className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          onClick={() => {
                            setEditingItem(item);
                            setDialogMode("edit");
                            setOpenMenuId(null);
                          }}
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
                <td className="px-3 py-3 text-zinc-500" colSpan={7}>
                  No softwares match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-zinc-600 dark:text-zinc-300">
            {`Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredItems.length)} of ${filteredItems.length}`}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="text-zinc-600 dark:text-zinc-300" htmlFor="softwares-page-size">
              Items/page
            </label>
            <select
              id="softwares-page-size"
              value={pageSizeMode}
              onChange={(event) => setPageSizeMode(event.target.value as PageSizeMode)}
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
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <span className="whitespace-nowrap text-zinc-600 dark:text-zinc-300">{`Page ${currentPage} / ${totalPages}`}</span>
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {dialogMode === "create" && (
        <SoftwareDialog
          mode="create"
          initialValues={formValues}
          catalogs={catalogs}
          instances={instances}
          instancesLoading={instancesLoading}
          saving={saving}
          onCancel={() => setDialogMode(null)}
          onSubmit={async (values) => onCreate(values as SoftwareCreateFormValues)}
        />
      )}

      {dialogMode === "edit" && editingItem && (
        <SoftwareDialog
          mode="edit"
          initialValues={formValues}
          catalogs={catalogs}
          instances={instances}
          instancesLoading={instancesLoading}
          saving={saving}
          onCancel={() => {
            setDialogMode(null);
            setEditingItem(null);
          }}
          onSubmit={async (values) => onUpdate(values as SoftwareUpdateFormValues)}
        />
      )}

      {variableDialogMode && variableSoftware && variableSoftware.domain && (
        <VariableDialog
          mode={variableDialogMode}
          softwareDomain={variableSoftware.domain}
          variableType={variableType}
          initialValues={variableFormValues}
          saving={variableSaving}
          onCancel={() => {
            setVariableDialogMode(null);
            setVariableType("software");
            setVariableSoftware(null);
            setEditingVariable(null);
          }}
          onSubmit={onVariableSubmit}
        />
      )}
    </ResourceShell>
  );
}
