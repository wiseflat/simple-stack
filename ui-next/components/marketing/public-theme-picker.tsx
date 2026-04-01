"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function PublicThemePicker() {
  const { setTheme, theme, resolvedTheme } = useTheme();

  const activeTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={[
          "inline-flex items-center justify-center p-1.5 transition-colors",
          activeTheme === "light"
            ? "text-zinc-900 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
        ].join(" ")}
        aria-pressed={activeTheme === "light"}
        aria-label="Light theme"
        title="Light theme"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={[
          "inline-flex items-center justify-center p-1.5 transition-colors",
          activeTheme === "dark"
            ? "text-zinc-900 dark:text-zinc-100"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
        ].join(" ")}
        aria-pressed={activeTheme === "dark"}
        aria-label="Dark theme"
        title="Dark theme"
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
}
