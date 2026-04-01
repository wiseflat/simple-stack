"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  BookCopy,
  Boxes,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  FileCode2,
  LayoutDashboard,
  LogOut,
  Network,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";

const ThemeToggle = dynamic(() => import("@/components/layout/theme-toggle"), {
  ssr: false,
});

type MenuSection = {
  name: string;
  items: Array<{
    href?: string;
    onClick?: () => void;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: string;
  }>;
};

type SideMenuProps = {
  userName?: string;
  userEmail?: string;
  collapsed: boolean;
  onToggle: () => void;
};

export default function SideMenu({ collapsed, onToggle }: SideMenuProps) {
  const pathname = usePathname();
  const t = useTranslations("menu");
  const tCommon = useTranslations("common");
  const [siteSettings, setSiteSettings] = useState<{ enablePublicLanding: boolean; enableDocumentation: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings/general", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setSiteSettings(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch site settings:", err);
      }
    }

    function onSettingsUpdated() {
      void fetchSettings();
    }

    void fetchSettings();
    window.addEventListener("site-settings-updated", onSettingsUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("site-settings-updated", onSettingsUpdated);
    };
  }, [pathname]);

  // Build menu sections
  const overviewItems: MenuSection["items"] = [
    ...(siteSettings?.enableDocumentation ? [{ href: "/docs", label: "documentation", icon: BookOpenText, badge: "Learn" }] : []),
    { href: "/dashboard", label: "dashboard", icon: LayoutDashboard, badge: "Home" },
  ];

  const coreDomainsItems: MenuSection["items"] = [
    { href: "/infrastructures", label: "infrastructures", icon: Network, badge: "Ops" },
    { href: "/catalogs", label: "catalogs", icon: BookCopy, badge: "Model" },
    { href: "/softwares", label: "softwares", icon: Boxes, badge: "Deploy" },
  ];

  const platformItems: MenuSection["items"] = [
    { href: "/profile", label: "profile", icon: Users, badge: "Me" },
    { href: "/users", label: "users", icon: Users, badge: "Team" },
    { href: "/api-interne", label: "internalApi", icon: FileCode2, badge: "API" },
    { href: "/events", label: "events", icon: ScrollText, badge: "Stream" },
    { href: "/settings", label: "settings", icon: Settings, badge: "Admin" },
    { onClick: () => signOut({ callbackUrl: "/" }), label: "logout", icon: LogOut },
  ];

  const sections: MenuSection[] = [
    { name: "Overview", items: overviewItems },
    { name: "Core domains", items: coreDomainsItems },
    { name: "Platform", items: platformItems },
  ];

  // Flatten items for mobile nav
  const allItems = [...overviewItems, ...coreDomainsItems, ...platformItems];

  return (
    <>
      <aside
        className={[
          "fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden border-r border-zinc-200 bg-white transition-all duration-200 max-md:hidden dark:border-zinc-800 dark:bg-zinc-950",
          collapsed ? "md:w-16" : "md:w-[260px]",
        ].join(" ")}
      >
        {/* Header: brand + toggle button */}
        <div
          className={[
            "flex shrink-0 items-center border-b border-zinc-200 dark:border-zinc-800",
            collapsed ? "justify-center p-3" : "justify-between px-5 py-4",
          ].join(" ")}
        >
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-zinc-500">{tCommon("brand")}</p>
              <h1 className="mt-1 truncate text-lg font-semibold">{tCommon("appName")}</h1>
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className={["flex-1 overflow-y-auto py-3", collapsed ? "px-2" : "px-3"].join(" ")}>
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.name}>
                {!collapsed && (
                  <p className="px-3 text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">{section.name}</p>
                )}
                <div className={["mt-2 space-y-1", !collapsed ? "" : ""].join(" ")}>
                  {section.items.map((item) => {
                    const isActive = item.href ? (pathname === item.href || pathname.startsWith(`${item.href}/`)) : false;
                    const Icon = item.icon;
                    const commonClasses = [
                      "flex items-center rounded-md py-2 text-sm transition-colors",
                      collapsed ? "justify-center px-2 gap-2" : "justify-between px-3",
                      isActive
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                    ].join(" ");

                    if (item.href) {
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          title={collapsed ? t(item.label) : undefined}
                          className={commonClasses}
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={16} className="shrink-0" />
                            {!collapsed && <span>{t(item.label)}</span>}
                          </div>
                          {!collapsed && item.badge && (
                            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    } else {
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.onClick}
                          title={collapsed ? t(item.label) : undefined}
                          className={commonClasses}
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={16} className="shrink-0" />
                            {!collapsed && <span>{t(item.label)}</span>}
                          </div>
                          {!collapsed && item.badge && (
                            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    }
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Actions section */}
        <div className={["shrink-0 space-y-1 border-t border-zinc-200 py-3", collapsed ? "px-2" : "px-3", "dark:border-zinc-800"].join(" ")}>
          <ThemeToggle compact fullWidth={!collapsed} />
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-1 py-1.5 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {allItems.map((item) => {
            const isActive = item.href ? (pathname === item.href || pathname.startsWith(`${item.href}/`)) : false;
            const Icon = item.icon;
            const commonMobileClasses = [
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors",
              isActive
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
            ].join(" ");

            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label={t(item.label)}
                  title={t(item.label)}
                  className={commonMobileClasses}
                >
                  <Icon size={18} className="shrink-0" />
                </Link>
              );
            } else if (item.onClick) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  aria-label={t(item.label)}
                  title={t(item.label)}
                  className={commonMobileClasses}
                >
                  <Icon size={18} className="shrink-0" />
                </button>
              );
            }
          })}
        </div>
      </nav>
    </>
  );
}
