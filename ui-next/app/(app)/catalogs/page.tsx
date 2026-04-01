"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Hammer, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import YAML from "yaml";
import { z } from "zod";
import ResourceShell from "@/components/ui/resource-shell";
import { CatalogCreateSchema, CatalogForkCreateSchema, CatalogUpdateSchema } from "@/lib/validations/catalog";

type Catalog = {
  id: string;
  name: string;
  version: string | null;
  forkable: boolean | null;
  alias: string | null;
  description: string | null;
  documentation: string | null;
  cron: boolean | null;
  crontab: string | null;
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

type CatalogVariableType = "settings";

type EditorMode = "json" | "yaml";
type PageSizeMode = "auto" | "10" | "20" | "50";

type Operation = {
  action: "build";
  name: string;
  comment: string;
};

const createInitial = { name: "", version: "1.0.0", forkable: true };
const updateInitial = { alias: "", description: "", documentation: "", cron: false, crontab: "* * * * *" };
const forkInitial = {
  parentId: "",
  origin: "",
  version: "1.0.0",
  suffix: "fork",
  alias: "Catalog Fork",
  description: "Forked catalog item",
  cron: false,
  crontab: "* * * * *",
  dockerfile_root: "",
  dockerfile_nonroot: "",
};

const catalogCreateFormSchema = CatalogCreateSchema;
const catalogForkFormSchema = CatalogForkCreateSchema.extend({
  parentId: z.string().min(1, "Select a parent catalog"),
});
const catalogUpdateFormSchema = CatalogUpdateSchema;
const VariableFormSchema = z.object({
  type: z.string().min(1, "type required"),
  key: z.string().min(1, "key required"),
  key2: z.string().min(1, "key2 required"),
  value: z.string(),
});

type CatalogCreateFormValues = z.infer<typeof catalogCreateFormSchema>;
type CatalogForkFormValues = z.infer<typeof catalogForkFormSchema>;
type CatalogUpdateFormValues = z.infer<typeof catalogUpdateFormSchema>;
type VariableFormValues = z.infer<typeof VariableFormSchema>;

type CatalogCreateDialogProps = {
  initialValues: CatalogCreateFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: CatalogCreateFormValues) => Promise<void>;
};

function CatalogCreateDialog({ initialValues, saving, onCancel, onSubmit }: CatalogCreateDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CatalogCreateFormValues>({
    resolver: zodResolver(catalogCreateFormSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold">Create catalog</h3>
            <p className="text-sm text-zinc-500">Create a new software catalog entry.</p>
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
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Name</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="postgresql"
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Version</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="1.0.0"
              {...register("version")}
            />
            {errors.version && <p className="text-xs text-red-600 dark:text-red-400">{errors.version.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            <label className="flex h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <input type="checkbox" {...register("forkable")} />
              Forkable
            </label>
            {errors.forkable && <p className="text-xs text-red-600 dark:text-red-400">{errors.forkable.message}</p>}
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
              {saving ? "Saving..." : "Create catalog"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type CatalogEditDialogProps = {
  initialValues: CatalogUpdateFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: CatalogUpdateFormValues) => Promise<void>;
};

function CatalogEditDialog({ initialValues, saving, onCancel, onSubmit }: CatalogEditDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CatalogUpdateFormValues>({
    resolver: zodResolver(catalogUpdateFormSchema),
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
            <h3 className="text-lg font-semibold">Edit catalog</h3>
            <p className="text-sm text-zinc-500">Update the selected software catalog entry.</p>
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
            <label className="text-sm font-medium">Alias</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="catalog"
              {...register("alias")}
            />
            {errors.alias && <p className="text-xs text-red-600 dark:text-red-400">{errors.alias.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Documentation URL</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="https://example.org/docs"
              {...register("documentation")}
            />
            {errors.documentation && <p className="text-xs text-red-600 dark:text-red-400">{errors.documentation.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="catalog item"
              {...register("description")}
            />
            {errors.description && <p className="text-xs text-red-600 dark:text-red-400">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Crontab</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="* * * * *"
              {...register("crontab")}
            />
            {errors.crontab && <p className="text-xs text-red-600 dark:text-red-400">{errors.crontab.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            <label className="flex h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <input type="checkbox" {...register("cron")} />
              Cron enabled
            </label>
            {errors.cron && <p className="text-xs text-red-600 dark:text-red-400">{errors.cron.message}</p>}
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
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type CatalogForkDialogProps = {
  items: Catalog[];
  initialValues: CatalogForkFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: CatalogForkFormValues) => Promise<void>;
};

function CatalogForkDialog({ items, initialValues, saving, onCancel, onSubmit }: CatalogForkDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CatalogForkFormValues>({
    resolver: zodResolver(catalogForkFormSchema),
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
            <h3 className="text-lg font-semibold">Create catalog fork</h3>
            <p className="text-sm text-zinc-500">Fork an existing catalog into a new customized entry.</p>
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
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Parent catalog</label>
            <select
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("parentId")}
            >
              <option value="">Parent catalog</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            {errors.parentId && <p className="text-xs text-red-600 dark:text-red-400">{errors.parentId.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Origin</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="catalog-origin"
              {...register("origin")}
            />
            {errors.origin && <p className="text-xs text-red-600 dark:text-red-400">{errors.origin.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Version</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="1.0.0"
              {...register("version")}
            />
            {errors.version && <p className="text-xs text-red-600 dark:text-red-400">{errors.version.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Suffix</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="fork"
              {...register("suffix")}
            />
            {errors.suffix && <p className="text-xs text-red-600 dark:text-red-400">{errors.suffix.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Alias</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Catalog Fork"
              {...register("alias")}
            />
            {errors.alias && <p className="text-xs text-red-600 dark:text-red-400">{errors.alias.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Forked catalog item"
              {...register("description")}
            />
            {errors.description && <p className="text-xs text-red-600 dark:text-red-400">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Crontab</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="* * * * *"
              {...register("crontab")}
            />
            {errors.crontab && <p className="text-xs text-red-600 dark:text-red-400">{errors.crontab.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            <label className="flex h-11 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <input type="checkbox" {...register("cron")} />
              Cron enabled
            </label>
            {errors.cron && <p className="text-xs text-red-600 dark:text-red-400">{errors.cron.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Dockerfile root</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder=""
              {...register("dockerfile_root")}
            />
            {errors.dockerfile_root && <p className="text-xs text-red-600 dark:text-red-400">{errors.dockerfile_root.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Dockerfile nonroot</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder=""
              {...register("dockerfile_nonroot")}
            />
            {errors.dockerfile_nonroot && <p className="text-xs text-red-600 dark:text-red-400">{errors.dockerfile_nonroot.message}</p>}
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
              {saving ? "Saving..." : "Create fork"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type VariableDialogProps = {
  mode: "create" | "edit";
  catalogName: string;
  variableType: CatalogVariableType;
  initialValues: VariableFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: VariableFormValues) => Promise<void>;
};

function VariableDialog({
  mode,
  catalogName,
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
                ? `Create ${variableType} variables for ${catalogName}.`
                : `Update ${variableType} variables for ${catalogName}.`}
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

export default function CatalogsPage() {
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<Catalog[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [forkForm, setForkForm] = useState(forkInitial);
  const [editingItem, setEditingItem] = useState<Catalog | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "fork" | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openOperationsMenuId, setOpenOperationsMenuId] = useState<boolean>(false);
  const [variableDialogMode, setVariableDialogMode] = useState<"create" | "edit" | null>(null);
  const [variableSaving, setVariableSaving] = useState(false);
  const [variableType, setVariableType] = useState<CatalogVariableType>("settings");
  const [variableScope, setVariableScope] = useState<VariableScope | null>(null);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
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

  const operations: Operation[] = [{ action: "build", name: "Build", comment: "Build selected catalogs ?" }];

  const createValues = useMemo<CatalogCreateFormValues>(() => createInitial, []);

  const editValues = useMemo<CatalogUpdateFormValues>(() => {
    if (!editingItem) return updateInitial;

    return {
      alias: editingItem.alias ?? "catalog",
      description: editingItem.description ?? "catalog item",
      documentation: editingItem.documentation ?? "",
      cron: Boolean(editingItem.cron),
      crontab: editingItem.crontab ?? "* * * * *",
    };
  }, [editingItem]);

  const forkValues = useMemo<CatalogForkFormValues>(() => {
    const parent = items.find((item) => item.id === forkForm.parentId);

    return {
      parentId: forkForm.parentId,
      origin: forkForm.origin || parent?.name || "",
      version: forkForm.version,
      suffix: forkForm.suffix,
      alias: forkForm.alias,
      description: forkForm.description,
      cron: forkForm.cron,
      crontab: forkForm.crontab,
      dockerfile_root: forkForm.dockerfile_root,
      dockerfile_nonroot: forkForm.dockerfile_nonroot,
    };
  }, [forkForm, items]);

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
      const res = await fetch("/api/catalogs", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { items: Catalog[] };
      const nextItems = json.items ?? [];
      setItems(nextItems);
      setForkForm((v) => {
        if (v.parentId || !nextItems.length) return v;
        return {
          ...v,
          parentId: nextItems[0].id,
          origin: nextItems[0].name,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load catalogs");
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
        const res = await fetch(`/api/catalogs/${id}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: operation.action }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to execute ${operation.name}`);
    } finally {
      setExecutingOperation(null);
    }
  }

  async function onCreate(values: CatalogCreateFormValues) {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/catalogs", {
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

  async function onUpdate(values: CatalogUpdateFormValues) {
    if (!editingItem) return;

    setSaving(true);
    setError(null);

    const res = await fetch(`/api/catalogs/${editingItem.id}`, {
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
    if (!confirm("Delete this catalog item?")) return;
    const res = await fetch(`/api/catalogs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `HTTP ${res.status}`);
      return;
    }
    await load();
  }

  async function onFork(values: CatalogForkFormValues) {
    setSaving(true);
    setError(null);

    const { parentId, ...payload } = values;
    const res = await fetch(`/api/catalogs/${parentId}/fork`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setSaving(false);
      setError(data.error ?? `HTTP ${res.status}`);
      return;
    }

    setDialogMode(null);
    setForkForm(() => ({
      ...forkInitial,
      parentId,
      origin: items.find((item) => item.id === parentId)?.name ?? "",
    }));
    await load();
    setSaving(false);
  }

  async function openVariableDialog(scope: VariableScope, selectedType: CatalogVariableType) {
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
      setVariableType("settings");
      setVariableScope(null);
      setEditingVariable(null);
      setVariableDialogMode(null);
      setError(err instanceof Error ? err.message : "Unable to load catalogs variable");
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
      setVariableType("settings");
      setVariableScope(null);
      setEditingVariable(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save catalogs variable");
    } finally {
      setVariableSaving(false);
    }
  }

  return (
    <ResourceShell
      title="Catalogs"
      subtitle="Create and manage software catalogs."
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
                {operations.map((operation) => (
                  <button
                    key={operation.action}
                    type="button"
                    disabled={executingOperation !== null}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    onClick={() => {
                      void executeOperation(operation);
                    }}
                  >
                    {executingOperation === operation.action ? (
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
                    ) : (
                      <Hammer className="h-4 w-4" />
                    )}
                    <span>{operation.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            onClick={() => {
              void openVariableDialog({ id: "catalogs", name: "catalogs" }, "settings");
            }}
          >
            Runner
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            onClick={() => {
              if (!items.length) {
                setError("Create a catalog before creating a fork");
                return;
              }

              if (!forkForm.parentId && items[0]) {
                setForkForm((v) => ({ ...v, parentId: items[0].id, origin: items[0].name }));
              }

              setDialogMode("fork");
            }}
          >
            Create fork
          </button>
          <button
            type="button"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            onClick={() => {
              setEditingItem(null);
              setDialogMode("create");
            }}
          >
            Create catalog
          </button>
        </div>
      }
    >

      <div ref={tableWrapperRef} className="overflow-x-auto overflow-y-visible rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[760px] text-sm">
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
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Crontab</th>
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
                <td className="px-3 py-2">{item.alias?.trim() ? item.alias : item.name}</td>
                <td className="px-3 py-2">{item.version}</td>
                <td className="px-3 py-2">{item.cron ? (item.crontab ?? "-") : "-"}</td>
                <td className="px-3 py-2 w-24">
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
            {!items.length && !loading && (
              <tr>
                <td className="px-3 py-3 text-zinc-500" colSpan={5}>
                  No catalogs yet.
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
            <label className="text-zinc-600 dark:text-zinc-300" htmlFor="catalogs-page-size">
              Items/page
            </label>
            <select
              id="catalogs-page-size"
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
        <CatalogCreateDialog
          initialValues={createValues}
          saving={saving}
          onCancel={() => setDialogMode(null)}
          onSubmit={onCreate}
        />
      )}

      {dialogMode === "edit" && editingItem && (
        <CatalogEditDialog
          initialValues={editValues}
          saving={saving}
          onCancel={() => {
            setDialogMode(null);
            setEditingItem(null);
          }}
          onSubmit={onUpdate}
        />
      )}

      {dialogMode === "fork" && (
        <CatalogForkDialog
          items={items}
          initialValues={forkValues}
          saving={saving}
          onCancel={() => setDialogMode(null)}
          onSubmit={onFork}
        />
      )}

      {variableDialogMode && variableScope && (
        <VariableDialog
          mode={variableDialogMode}
          catalogName={variableScope.name}
          variableType={variableType}
          initialValues={variableFormValues}
          saving={variableSaving}
          onCancel={() => {
            setVariableDialogMode(null);
            setVariableType("settings");
            setVariableScope(null);
            setEditingVariable(null);
          }}
          onSubmit={onVariableSubmit}
        />
      )}
    </ResourceShell>
  );
}
