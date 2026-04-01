"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

type ThemeToggleProps = {
  compact?: boolean;
  fullWidth?: boolean;
};

export default function ThemeToggle({ compact = false, fullWidth = true }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = useTranslations("theme");

  const activeTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = activeTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={[
        "flex items-center rounded-md border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800",
        fullWidth ? "w-full" : "w-auto",
        compact ? "justify-center p-2" : "gap-2 px-3 py-2 text-left",
      ].join(" ")}
      aria-label={t("toggleAria")}
      title={t("toggleAria")}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {!compact && <span>{isDark ? t("toLight") : t("toDark")}</span>}
    </button>
  );
}
