"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  Box,
  Globe,
  MoreHorizontal,
  Play,
  RefreshCw,
  Search,
  Server,
  Shield,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import YAML from "yaml";
import { z } from "zod";
import ResourceShell from "@/components/ui/resource-shell";
import {
  DEFAULT_INFRASTRUCTURE_ICON,
  infrastructureIconComponents,
  infrastructureIconOptions,
  normalizeInfrastructureIcon,
} from "@/lib/infrastructure-icons";
import { InfrastructureCreateSchema } from "@/lib/validations/infrastructure";

type Infrastructure = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
};

type Variable = {
  id: string;
  type: string;
  key: string;
  key2?: string;
  value?: string;
};

type VariableScope = {
  id: string;
  name: string;
};

type InfrastructureVariableType = "project" | "tfstate" | "settings";

type EditorMode = "json" | "yaml";
type PageSizeMode = "auto" | "10" | "20" | "50";

const emptyForm = { name: "", description: "", icon: DEFAULT_INFRASTRUCTURE_ICON, color: "#2f80ed" };
const VariableFormSchema = z.object({
  type: z.string().min(1, "type required"),
  key: z.string().min(1, "key required"),
  key2: z.string().min(1, "key2 required"),
  value: z.string(),
});

const infrastructureFormSchema = InfrastructureCreateSchema;
type InfrastructureFormValues = z.infer<typeof infrastructureFormSchema>;
type VariableFormValues = z.infer<typeof VariableFormSchema>;

type InfrastructureDialogProps = {
  mode: "create" | "edit";
  initialValues: InfrastructureFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: InfrastructureFormValues) => Promise<void>;
};

type VariableDialogProps = {
  mode: "create" | "edit";
  infrastructureName: string;
  variableType: InfrastructureVariableType;
  initialValues: VariableFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: VariableFormValues) => Promise<void>;
};

function InfrastructureDialog({
  mode,
  initialValues,
  saving,
  onCancel,
  onSubmit,
}: InfrastructureDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InfrastructureFormValues>({
    resolver: zodResolver(infrastructureFormSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold">
              {mode === "create" ? "Create infrastructure" : "Edit infrastructure"}
            </h3>
            <p className="text-sm text-zinc-500">
              {mode === "create"
                ? "Define a new infrastructure project."
                : "Update the selected infrastructure project."}
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
            <label className="text-sm font-medium">Name</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Frontend-Europe"
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Production infrastructure in western Europe"
              {...register("description")}
            />
            {errors.description && <p className="text-xs text-red-600 dark:text-red-400">{errors.description.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <label className="text-sm font-medium">Icon</label>
                <Controller
                  control={control}
                  name="icon"
                  render={({ field }) => {
                    const SelectedIcon = infrastructureIconComponents[normalizeInfrastructureIcon(field.value)];

                    return (
                      <div className="flex items-center gap-3 rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                          <SelectedIcon size={16} />
                        </span>
                        <select
                          className="w-full bg-transparent text-sm outline-none"
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                        >
                          {infrastructureIconOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }}
                />
                {errors.icon && <p className="text-xs text-red-600 dark:text-red-400">{errors.icon.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <input
                  type="color"
                  className="h-11 w-full rounded border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
                  {...register("color")}
                />
                {errors.color && <p className="text-xs text-red-600 dark:text-red-400">{errors.color.message}</p>}
              </div>
            </div>
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
              {saving ? "Saving..." : mode === "create" ? "Create infrastructure" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VariableDialog({
  mode,
  infrastructureName,
  variableType,
  initialValues,
  saving,
  onCancel,
  onSubmit,
}: VariableDialogProps) {
  const {
    control,
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
                ? `Create ${variableType} variables for ${infrastructureName}.`
                : `Update ${variableType} variables for ${infrastructureName}.`}
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
            <Controller
              control={control}
              name="value"
              render={({ field }) => (
                <textarea
                  className="min-h-56 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder={editorMode === "json" ? "JSON content" : "YAML content"}
                  value={field.value ?? ""}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                    validateEditorContent(event.target.value, editorMode);
                  }}
                />
              )}
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

type Operation = {
  action: string;
  path: "execute" | "remove";
  name: string;
  icon: string;
  comment: string;
  isDanger?: boolean;
};

function OperationIcon({ action }: { action: string }) {
  const className = "h-4 w-4";

  if (action === "main") return <Play className={className} />;
  if (action === "docker") return <Box className={className} />;
  if (action === "nomad") return <Server className={className} />;
  if (action === "coredns") return <Globe className={className} />;
  if (action === "firewall") return <Shield className={className} />;
  if (action === "metrology") return <Activity className={className} />;
  if (action === "scan_exporter") return <Search className={className} />;
  if (action === "nomad-clean-errors") return <RefreshCw className={className} />;
  if (action === "remove") return <Trash2 className={className} />;
  return <Play className={className} />;
}

export default function InfrastructuresPage() {
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<Infrastructure[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<Infrastructure | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [variableDialogMode, setVariableDialogMode] = useState<"create" | "edit" | null>(null);
  const [variableSaving, setVariableSaving] = useState(false);
  const [variableType, setVariableType] = useState<InfrastructureVariableType>("project");
  const [variableScope, setVariableScope] = useState<VariableScope | null>(null);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openOperationsMenuId, setOpenOperationsMenuId] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [autoItemsPerPage, setAutoItemsPerPage] = useState(12);
  const [pageSizeMode, setPageSizeMode] = useState<PageSizeMode>("auto");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executingOperation, setExecutingOperation] = useState<string | null>(null);

  const itemsPerPage =
    pageSizeMode === "auto" ? autoItemsPerPage : Number(pageSizeMode);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [currentPage, items, itemsPerPage]);

  const operations: Operation[] = [
    { action: "main", path: "execute", name: "Run all playbooks", icon: "ti ti-play green", comment: "Do you want to run all playbook ?" },
    { action: "docker", path: "execute", name: "docker", icon: "ti ti-play", comment: "Do you want to run docker playbook ?" },
    { action: "nomad", path: "execute", name: "nomad", icon: "ti ti-play", comment: "Do you want to run nomad playbook ?" },
    { action: "coredns", path: "execute", name: "coredns", icon: "ti ti-play", comment: "Do you want to run coredns playbook ?" },
    { action: "firewall", path: "execute", name: "firewall", icon: "ti ti-play", comment: "Do you want to run firewall playbook ?" },
    { action: "metrology", path: "execute", name: "metrology", icon: "ti ti-play", comment: "Do you want to run metrology playbook ?" },
    { action: "scan_exporter", path: "execute", name: "Prometheus scan exporter", icon: "ti ti-play", comment: "Do you want to run scan_exporter?" },
    { action: "nomad-clean-errors", path: "execute", name: "Clean nomad errors", icon: "ti ti-play orange", comment: "Do you want to clean nomad errors ?" },
    { action: "remove", path: "remove", name: "Remove", icon: "ti ti-trash red", comment: "Remove selected infrastructures ?", isDanger: true },
  ];

  const formValues = useMemo<InfrastructureFormValues>(() => {
    if (dialogMode === "edit" && editingItem) {
      return {
        name: editingItem.name,
        description: editingItem.description,
        icon: normalizeInfrastructureIcon(editingItem.icon),
        color: editingItem.color,
      };
    }

    return emptyForm;
  }, [dialogMode, editingItem]);

  const variableFormValues = useMemo<VariableFormValues>(() => {
    if (variableDialogMode === "edit" && editingVariable) {
      return {
        type: editingVariable.type,
        key: editingVariable.key,
        key2: editingVariable.key2 ?? variableScope?.name ?? "",
        value: editingVariable.value ?? "{}",
      };
    }

    return {
      type: variableType,
      key: variableScope?.id ?? "",
      key2: variableScope?.name ?? "",
      value: "{}",
    };
  }, [editingVariable, variableDialogMode, variableScope, variableType]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/infrastructures", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { items: Infrastructure[] };
      setItems(json.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load infrastructures");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
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
    function updateItemsPerPage() {
      const viewport = window.innerHeight;
      const rowHeight = 52;
      const paginationReserve = 86;
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

  async function onSubmit(values: InfrastructureFormValues) {
    const endpoint = dialogMode === "edit" && editingItem
      ? `/api/infrastructures/${editingItem.id}`
      : "/api/infrastructures";
    const method = dialogMode === "edit" ? "PUT" : "POST";

    setSaving(true);
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

      setDialogMode(null);
      setEditingItem(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save infrastructure");
    } finally {
      setSaving(false);
    }
  }

  async function executeOperation(operation: Operation) {
    if (selectedIds.size === 0) return;

    if (!confirm(operation.comment)) return;

    setExecutingOperation(operation.action);
    setError(null);
    setOpenOperationsMenuId(false);

    try {
      for (const id of Array.from(selectedIds)) {
        const res = await fetch(`/api/infrastructures/${id}/${operation.path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: operation.action }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        // For remove operation, reload after successful delete
        if (operation.action === "remove") {
          await load();
          setSelectedIds(new Set());
          return;
        }
      }

      // Reload data after operations
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to execute ${operation.name}`);
    } finally {
      setExecutingOperation(null);
    }
  }

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
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  async function openVariableDialog(scope: VariableScope, selectedType: InfrastructureVariableType) {
    setError(null);
    setOpenMenuId(null);
    setVariableType(selectedType);
    setVariableScope(scope);

    try {
      const listRes = await fetch(
        `/api/variables?type=${encodeURIComponent(selectedType)}&key=${encodeURIComponent(scope.id)}&key2=${encodeURIComponent(scope.name)}`,
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
        `/api/variables/${existingVariable.id}?key=${encodeURIComponent(scope.id)}&key2=${encodeURIComponent(scope.name)}&type=${encodeURIComponent(selectedType)}&format=yaml`,
        { cache: "no-store" },
      );
      if (!detailRes.ok) throw new Error(`HTTP ${detailRes.status}`);

      const detail = (await detailRes.json()) as { id: string; key: string; key2?: string; type: string; value: string | Record<string, unknown> };
      setEditingVariable({
        id: detail.id,
        key: detail.key,
        key2: detail.key2 ?? scope.name,
        type: detail.type,
        value: typeof detail.value === "string" ? detail.value : YAML.stringify(detail.value ?? {}),
      });
      setVariableDialogMode("edit");
    } catch (err) {
      setVariableType("project");
      setVariableScope(null);
      setEditingVariable(null);
      setVariableDialogMode(null);
      setError(err instanceof Error ? err.message : "Unable to load infrastructure variable");
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
      setVariableType("project");
      setVariableScope(null);
      setEditingVariable(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save infrastructure variable");
    } finally {
      setVariableSaving(false);
    }
  }

  return (
    <ResourceShell
      title="Infrastructures"
      subtitle="List, create, update and remove infrastructure projects."
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
                    {index === 8 ? (
                      <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                    ) : null}
                    <button
                      type="button"
                      disabled={executingOperation !== null}
                      className={[
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-900",
                        operation.isDanger ? "text-red-600" : "",
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
              void openVariableDialog({ id: "infrastructures", name: "infrastructures" }, "settings");
            }}
          >
            Runner
          </button>
          <button
            type="button"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            onClick={() => {
              setEditingItem(null);
              setDialogMode("create");
            }}
          >
            Create infrastructure
          </button>
        </div>
      }
    >
      <div ref={tableWrapperRef} className="overflow-x-auto overflow-y-visible rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-zinc-100 text-left dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 w-12">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                  checked={paginatedItems.length > 0 && paginatedItems.every((item) => selectedIds.has(item.id))}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 w-24">Actions</th>
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
                <td className="px-3 py-2 w-24">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const option = infrastructureIconOptions.find(
                        (candidate) => candidate.value === normalizeInfrastructureIcon(item.icon),
                      );
                      const Icon = option?.icon;

                      return Icon ? (
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                          style={{ color: item.color }}
                        >
                          <Icon size={16} />
                        </span>
                      ) : null;
                    })()}
                    <span>{item.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2">{item.description}</td>
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
                            void openVariableDialog(item, "project");
                          }}
                        >
                          Variables
                        </button>
                        <button
                          type="button"
                          className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          onClick={() => {
                            void openVariableDialog(item, "tfstate");
                          }}
                        >
                          Tfstates
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
                            toggleSelectId(item.id);
                            setSelectedIds(new Set([item.id]));
                            setTimeout(() => {
                              const removeOp = operations.find((op) => op.action === "remove");
                              if (removeOp) {
                                void executeOperation(removeOp);
                              }
                            }, 0);
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
            {!items.length && !loading && (
              <tr>
                <td className="px-3 py-3 text-zinc-500" colSpan={4}>
                  No infrastructures yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-zinc-600 dark:text-zinc-300">
            {`Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, items.length)} of ${items.length}`}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="text-zinc-600 dark:text-zinc-300" htmlFor="infrastructures-page-size">
              Items/page
            </label>
            <select
              id="infrastructures-page-size"
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

      {dialogMode && (
        <InfrastructureDialog
          mode={dialogMode}
          initialValues={formValues}
          saving={saving}
          onCancel={() => {
            setDialogMode(null);
            setEditingItem(null);
          }}
          onSubmit={onSubmit}
        />
      )}

      {variableDialogMode && variableScope && (
        <VariableDialog
          mode={variableDialogMode}
          infrastructureName={variableScope.name}
          variableType={variableType}
          initialValues={variableFormValues}
          saving={variableSaving}
          onCancel={() => {
            setVariableDialogMode(null);
            setVariableType("project");
            setVariableScope(null);
            setEditingVariable(null);
          }}
          onSubmit={onVariableSubmit}
        />
      )}
    </ResourceShell>
  );
}
