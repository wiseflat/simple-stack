"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, Boxes, BookCopy, ChevronLeft, ChevronRight, Home, Network, LayoutDashboard, Settings, FileCode2, ScrollText, Users, Sliders } from "lucide-react";
import { groupedDocs } from "@/lib/docs/source";

type PublicSidebarProps = {
  isAuthenticated: boolean;
  userName?: string;
  collapsed: boolean;
  onToggle: () => void;
};

const docIcons = {
  intro: Home,
  installation: BookOpenText,
  infrastructures: Network,
  catalogs: BookCopy,
  softwares: Boxes,
  profile: Users,
  settings: Settings,
  "api-interne": FileCode2,
  events: ScrollText,
  variables: Sliders,
  users: Users,
} as const;

export default function PublicSidebar({ isAuthenticated, collapsed, onToggle }: PublicSidebarProps) {
  const pathname = usePathname();
  const sidebarNavId = "public-sidebar-nav";

  return (
    <>
      <aside className={[
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-zinc-200 bg-white/95 backdrop-blur transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950/95",
        collapsed ? "w-16" : "w-[260px]",
      ].join(" ")}>
        <div
          className={[
            "flex items-center border-b border-zinc-200 dark:border-zinc-800",
            collapsed ? "justify-center px-2 py-4" : "justify-between px-6 py-5",
          ].join(" ")}
        >
          {!collapsed && (
            <Link href="/" className="block min-w-0">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Simple Stack</p>
              <h1 className="mt-2 truncate text-lg font-semibold text-zinc-950 dark:text-zinc-50">Wiseflat concept</h1>
            </Link>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            aria-expanded={!collapsed}
            aria-controls={sidebarNavId}
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div
          id={sidebarNavId}
          className={[
          "flex-1 overflow-y-auto py-5",
          collapsed ? "px-2" : "px-4",
        ].join(" ")}
        >
          <div className="space-y-6">
            <div>
              {!collapsed && <p className="px-3 text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">Overview</p>}
              <div className="mt-2 space-y-1">
                <Link
                  href="/"
                  title={collapsed ? "Home" : undefined}
                  className={[
                    "flex items-center rounded-md py-2 text-sm transition-colors",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    pathname === "/"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                  ].join(" ")}
                >
                  <Home className="h-4 w-4" />
                  {!collapsed && <span>Home</span>}
                </Link>

                <Link
                  href={isAuthenticated ? "/dashboard" : "/login"}
                  title={collapsed ? "Dashboard" : undefined}
                  className={[
                    "flex items-center rounded-md py-2 text-sm transition-colors",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    pathname === "/dashboard"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                  ].join(" ")}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {!collapsed && <span>Dashboard</span>}
                </Link>
              </div>
            </div>

            <div className="mt-3 space-y-4">
              {groupedDocs.map((section) => (
                <div key={section.group}>
                  {!collapsed && (
                    <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                      {section.group}
                    </div>
                  )}

                  <div className="space-y-1">
                    {section.items.map((doc) => {
                      const Icon = docIcons[doc.slug as keyof typeof docIcons] ?? ChevronRight;
                      const href = `/docs/${doc.slug}`;
                      const isActive = pathname === href || (pathname === "/docs" && doc.slug === "intro");

                      return (
                        <Link
                          key={doc.slug}
                          href={href}
                          title={collapsed ? doc.title : undefined}
                          className={[
                            "flex items-center rounded-md py-2 text-sm transition-colors",
                            collapsed ? "justify-center px-2" : "gap-3 px-3",
                            isActive
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="min-w-0 flex-1 truncate">{doc.title}</span>}
                          {!collapsed && doc.badge ? (
                            <span
                              className={[
                                "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
                                isActive
                                  ? "border-white/30 bg-white/10 text-white dark:border-zinc-900/20 dark:bg-zinc-900/10 dark:text-zinc-900"
                                  : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                              ].join(" ")}
                            >
                              {doc.badge}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
