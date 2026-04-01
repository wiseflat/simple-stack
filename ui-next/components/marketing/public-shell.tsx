import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import PublicCollapsibleLayout from "@/components/marketing/public-collapsible-layout";

type PublicShellProps = {
  children: ReactNode;
  showSidebar?: boolean;
};

export default async function PublicShell({ children, showSidebar = true }: PublicShellProps) {
  const session = await auth();
  const isAuthenticated = !!session?.user;
  const userName = session?.user?.name;
  const siteSettings = await getSiteSettings();
  const year = new Date().getFullYear();

  const isPublicSectionEnabled = showSidebar
    ? siteSettings.enableDocumentation
    : siteSettings.enablePublicLanding;

  if (!isPublicSectionEnabled) {
    redirect(isAuthenticated ? "/dashboard" : "/login");
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef] text-zinc-900 dark:bg-[#09090b] dark:text-zinc-100">
      <PublicCollapsibleLayout
        showSidebar={showSidebar}
        isAuthenticated={isAuthenticated}
        userName={userName || undefined}
        year={year}
      >
        {children}
      </PublicCollapsibleLayout>
    </div>
  );
}
