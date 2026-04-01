import type { ReactNode } from "react";
import PublicShell from "@/components/marketing/public-shell";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <PublicShell showSidebar>{children}</PublicShell>;
}
