"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import ResourceShell from "@/components/ui/resource-shell";
import { UserCreateSchema, UserUpdateSchema } from "@/lib/validations/user";

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  language: string;
  sa: boolean;
  isdisabled: boolean;
};

type PageSizeMode = "auto" | "10" | "20" | "50";

const UserCreateFormSchema = UserCreateSchema.extend({
  token: z.union([z.string().regex(/^[\w_]{64}$/, "Invalid token"), z.literal("")]).optional(),
});
const UserUpdateFormSchema = UserUpdateSchema.extend({
  password: z.union([
    z.string().regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}.*$/, "Minimum eight characters, at least one letter and one number"),
    z.literal(""),
  ]).optional(),
  token: z.union([z.string().regex(/^[\w_]{64}$/, "Invalid token"), z.literal("")]).optional(),
});
type UserCreateFormValues = z.infer<typeof UserCreateFormSchema>;
type UserUpdateFormValues = z.infer<typeof UserUpdateFormSchema>;

const languageOptions = ["fr", "en", "es", "sk"] as const;
const emptyCreate: UserCreateFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  language: "fr",
  password: "",
  token: "",
  isdisabled: false,
  sa: false,
};

type UserDialogProps = {
  mode: "create" | "edit";
  initialValues: UserCreateFormValues | UserUpdateFormValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: UserCreateFormValues | UserUpdateFormValues) => Promise<void>;
};

function UserDialog({ mode, initialValues, saving, onCancel, onSubmit }: UserDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserCreateFormValues | UserUpdateFormValues>({
    resolver: zodResolver(mode === "create" ? UserCreateFormSchema : UserUpdateFormSchema),
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
            <h3 className="text-lg font-semibold">{mode === "create" ? "Create user" : "Edit user"}</h3>
            <p className="text-sm text-zinc-500">{mode === "create" ? "Admin only user management." : "Update the selected user account."}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit((values) => onSubmit(values))} className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">First name</label>
            <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" placeholder="John" {...register("first_name")} />
            {errors.first_name && <p className="text-xs text-red-600 dark:text-red-400">{errors.first_name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Last name</label>
            <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" placeholder="Doe" {...register("last_name")} />
            {errors.last_name && <p className="text-xs text-red-600 dark:text-red-400">{errors.last_name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input type="email" className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" placeholder="user@example.com" {...register("email")} />
            {errors.email && <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Language</label>
            <select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" {...register("language")}>
              {languageOptions.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
            {errors.language && <p className="text-xs text-red-600 dark:text-red-400">{errors.language.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder={mode === "create" ? "Password" : "Leave blank to keep current"}
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Token</label>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder={mode === "create" ? "Optional token" : "Leave blank to keep current"}
              {...register("token")}
            />
            {errors.token && <p className="text-xs text-red-600 dark:text-red-400">{errors.token.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Options</label>
            <div className="flex flex-wrap gap-6 rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register("isdisabled")} />
                Disabled
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register("sa")} />
                Super admin
              </label>
            </div>
          </div>

          <div className="flex items-end justify-end gap-3 md:col-span-2">
            <button type="button" onClick={onCancel} className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
              Cancel
            </button>
            <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900" type="submit" disabled={saving}>
              {saving ? "Saving..." : mode === "create" ? "Create user" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<User[]>([]);
  const [editingItem, setEditingItem] = useState<User | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [autoItemsPerPage, setAutoItemsPerPage] = useState(12);
  const [pageSizeMode, setPageSizeMode] = useState<PageSizeMode>("auto");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage =
    pageSizeMode === "auto" ? autoItemsPerPage : Number(pageSizeMode);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [currentPage, items, itemsPerPage]);

  const formValues = useMemo<UserCreateFormValues | UserUpdateFormValues>(() => {
    if (dialogMode === "edit" && editingItem) {
      return {
        first_name: editingItem.first_name,
        last_name: editingItem.last_name,
        email: editingItem.email,
        language: editingItem.language as UserUpdateFormValues["language"],
        password: "",
        token: "",
        isdisabled: editingItem.isdisabled,
        sa: editingItem.sa,
      };
    }

    return emptyCreate;
  }, [dialogMode, editingItem]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.status === 403) {
        setError("Admin access required");
        setItems([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as User[];
      setItems(json ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users");
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
    }

    if (!openMenuId) return;

    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [openMenuId]);

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

  async function onCreate(values: UserCreateFormValues) {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...values,
        token: values.token || undefined,
      };
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setDialogMode(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create user");
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate(values: UserUpdateFormValues) {
    if (!editingItem) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...values,
        password: values.password || undefined,
        token: values.token || undefined,
      };
      const res = await fetch(`/api/users/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setDialogMode(null);
      setEditingItem(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save user");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this user?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `HTTP ${res.status}`);
      return;
    }
    await load();
  }

  return (
    <ResourceShell
      title="Users"
      subtitle="Admin only user management."
      loading={loading}
      error={error}
      stickyHeader
      actions={
        <button
          type="button"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          onClick={() => {
            setEditingItem(null);
            setDialogMode("create");
          }}
        >
          Create user
        </button>
      }
    >
      <div ref={tableWrapperRef} className="overflow-x-auto overflow-y-visible rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-zinc-100 text-left dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((item) => (
              <tr key={item.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2">{item.first_name} {item.last_name}</td>
                <td className="px-3 py-2">{item.email}</td>
                <td className="px-3 py-2">{item.sa ? "admin" : "user"}{item.isdisabled ? " (disabled)" : ""}</td>
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
                <td className="px-3 py-3 text-zinc-500" colSpan={4}>No users found.</td>
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
            <label className="text-zinc-600 dark:text-zinc-300" htmlFor="users-page-size">
              Items/page
            </label>
            <select
              id="users-page-size"
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
        <UserDialog
          mode="create"
          initialValues={formValues}
          saving={saving}
          onCancel={() => setDialogMode(null)}
          onSubmit={async (values) => onCreate(values as UserCreateFormValues)}
        />
      )}

      {dialogMode === "edit" && editingItem && (
        <UserDialog
          mode="edit"
          initialValues={formValues}
          saving={saving}
          onCancel={() => {
            setDialogMode(null);
            setEditingItem(null);
          }}
          onSubmit={async (values) => onUpdate(values as UserUpdateFormValues)}
        />
      )}
    </ResourceShell>
  );
}
