"use client";

import { useEffect, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import atomOneDark from "react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark";
import atomOneLight from "react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light";
import YAML from "yaml";
import { useTheme } from "next-themes";

type RolesData = Record<string, Record<string, unknown> | null>;

type DocsRolesVariablesProps = {
  scope?: "paas" | "saas";
};

export default function DocsRolesVariables({ scope = "paas" }: DocsRolesVariablesProps) {
  const { theme, resolvedTheme } = useTheme();
  const [rolesData, setRolesData] = useState<RolesData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/docs/roles-variables?scope=${scope}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch roles variables");
        return res.json();
      })
      .then((data) => {
        setRolesData(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Error:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [scope]);

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Loading {scope.toUpperCase()} roles variables...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
        Error: {error}
      </div>
    );
  }

  const rolesWithVars = Object.entries(rolesData)
    .filter(([, vars]) => vars !== null && Object.keys(vars || {}).length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  if (rolesWithVars.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        No {scope.toUpperCase()} roles with variables found
      </div>
    );
  }

  const isDark = resolvedTheme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const highlighterStyle = isDark ? atomOneDark : atomOneLight;

  return (
    <div className="space-y-3">
      {rolesWithVars.map(([roleName, vars]) => (
        <details
          key={roleName}
          className="group cursor-pointer rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950 overflow-hidden"
        >
          <summary className="flex items-center gap-2 px-4 py-3 font-medium text-zinc-900 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900/50 transition-colors">
            <span className="text-sm font-semibold">{roleName}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ({Object.keys(vars || {}).length} variables)
            </span>
          </summary>

          <div className="border-t border-zinc-200 dark:border-zinc-700">
            <SyntaxHighlighter
              language="yaml"
              style={highlighterStyle}
              showLineNumbers={false}
              customStyle={{
                margin: 0,
                padding: "1rem",
                fontSize: "0.875rem",
                lineHeight: "1.5",
                borderRadius: "0",
              }}
            >
              {YAML.stringify(vars, null, 2)}
            </SyntaxHighlighter>
          </div>
        </details>
      ))}
    </div>
  );
}
