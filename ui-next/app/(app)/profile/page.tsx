"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ResourceShell from "@/components/ui/resource-shell";

type ProfileForm = {
  first_name: string;
  last_name: string;
  email: string;
  language: string;
};

const initialForm: ProfileForm = {
  first_name: "",
  last_name: "",
  email: "",
  language: "fr",
};

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [initialLanguage, setInitialLanguage] = useState("fr");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  async function loadProfile() {
    try {
      setLoading(true);
      setProfileError(null);
      const res = await fetch("/api/users/profile", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ProfileForm;
      setForm({
        first_name: json.first_name ?? "",
        last_name: json.last_name ?? "",
        email: json.email ?? "",
        language: json.language ?? "fr",
      });
      setInitialLanguage(json.language ?? "fr");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Unable to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const languageChanged = form.language !== initialLanguage;
      if (languageChanged) {
        document.cookie = `NEXT_LOCALE=${form.language}; path=/; max-age=31536000; samesite=lax`;
      }

      setProfileSuccess("Profile updated");

      if (languageChanged) {
        router.refresh();
        window.location.reload();
        return;
      }

      setInitialLanguage(form.language);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Unable to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onPasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (password.length < 6) {
      setPasswordError("Password must contain at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/users/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Unable to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <ResourceShell
      title="Profile"
      subtitle="Update your account details, language preference, and password."
      loading={loading}
      error={profileError}
    >
      <div className="space-y-4">
        <form
          onSubmit={onSave}
          className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-2"
        >
          <input
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="First name"
            value={form.first_name}
            onChange={(e) => setForm((v) => ({ ...v, first_name: e.target.value }))}
            required
          />
          <input
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Last name"
            value={form.last_name}
            onChange={(e) => setForm((v) => ({ ...v, last_name: e.target.value }))}
            required
          />
          <input
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
            required
          />
          <select
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={form.language}
            onChange={(e) => setForm((v) => ({ ...v, language: e.target.value }))}
          >
            <option value="fr">fr</option>
            <option value="en">en</option>
            <option value="es">es</option>
            <option value="sk">sk</option>
          </select>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              type="submit"
              disabled={savingProfile}
            >
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
            {profileSuccess && <p className="text-sm text-emerald-600">{profileSuccess}</p>}
          </div>
        </form>

        <form
          onSubmit={onPasswordSubmit}
          className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Password</h2>
          {passwordError && <p className="text-sm text-rose-600">{passwordError}</p>}
          <input
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className="flex items-center gap-2">
            <button
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              type="submit"
              disabled={savingPassword}
            >
              {savingPassword ? "Updating..." : "Update password"}
            </button>
            {passwordSuccess && <p className="text-sm text-emerald-600">{passwordSuccess}</p>}
          </div>
        </form>
      </div>
    </ResourceShell>
  );
}
