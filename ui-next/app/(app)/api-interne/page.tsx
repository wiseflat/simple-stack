import { auth } from "@/lib/auth";
import ApiTester from "@/app/(app)/api-interne/api-tester";
import { redirect } from "next/navigation";

type SessionUser = {
  role?: string;
  sa?: boolean;
};

export default async function InternalApiPage() {
  const session = await auth();
  const user = (session?.user ?? null) as SessionUser | null;
  const isAdmin = !!user?.sa || user?.role === "admin";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return <ApiTester />;
}
