"use client";

import { useState } from "react";
import PublicSidebar from "@/components/marketing/public-sidebar";

type PublicCollapsibleLayoutProps = {
  children: React.ReactNode;
  showSidebar: boolean;
  isAuthenticated: boolean;
  userName?: string;
  year: number;
};

export default function PublicCollapsibleLayout({
  children,
  showSidebar,
  isAuthenticated,
  userName,
  year,
}: PublicCollapsibleLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {showSidebar ? (
        <PublicSidebar
          isAuthenticated={isAuthenticated}
          userName={userName}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />
      ) : null}

      <main
        className={[
          "min-h-screen px-4 py-5 md:px-6 md:py-6 xl:px-8 transition-all duration-200",
          showSidebar ? (collapsed ? "ml-0 md:ml-16" : "ml-0 md:ml-[260px]") : "",
        ].join(" ")}
      >
        <div className="flex w-full flex-col gap-5">
          <div className="w-full">{children}</div>

          <footer className="border-t border-zinc-200/80 pt-5 text-center text-xs text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
            {`© ${year} Wiseflat Simple Stack - Concept rights reserved.`}
          </footer>
        </div>
      </main>
    </>
  );
}
