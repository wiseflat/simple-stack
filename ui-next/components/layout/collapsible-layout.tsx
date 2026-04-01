"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import SideMenu from "@/components/layout/side-menu";

type CollapsibleLayoutProps = {
  userName?: string;
  userEmail?: string;
  children: React.ReactNode;
};

export default function CollapsibleLayout({
  userName,
  userEmail,
  children,
}: CollapsibleLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

  return (
    <>
      <SideMenu
        userName={userName}
        userEmail={userEmail}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <div
        className={[
          isDashboard
            ? "flex h-screen min-w-0 flex-col overflow-hidden transition-all duration-200"
            : "flex min-h-screen min-w-0 flex-col transition-all duration-200",
          collapsed ? "ml-0 md:ml-16" : "ml-0 md:ml-[260px]",
        ].join(" ")}
      >
        <main
          className={
            isDashboard
              ? "flex min-h-0 min-w-0 flex-1 overflow-hidden p-4 pb-20 md:p-6 md:pb-6"
              : "flex-1 p-4 pb-20 md:p-6 md:pb-6"
          }
        >
          {children}
        </main>
      </div>
    </>
  );
}
