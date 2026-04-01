"use client";

type ResourceShellProps = {
  title: string;
  subtitle?: string;
  error?: string | null;
  loading?: boolean;
  actions?: React.ReactNode;
  stickyHeader?: boolean;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
};

export default function ResourceShell({
  title,
  subtitle,
  error,
  loading,
  actions,
  stickyHeader = false,
  headerExtra,
  children,
}: ResourceShellProps) {
  return (
    <section className="space-y-4">
      <div
        className={[
          stickyHeader ? "sticky top-0 z-20 rounded-b-lg border-b border-zinc-200 bg-white/95 px-3 pb-3 pt-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95" : "",
          "space-y-3",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
          </div>
          {actions}
        </div>

        {headerExtra}

        {loading && <p className="text-sm text-zinc-500">Loading...</p>}
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}
