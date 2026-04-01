import type { Metadata } from "next";
import CollapsibleLayout from "@/components/layout/collapsible-layout";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Wiseflat concept",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <CollapsibleLayout
        userName={session?.user?.name ?? undefined}
        userEmail={session?.user?.email ?? undefined}
      >
        {children}
      </CollapsibleLayout>
    </div>
  );
}
