"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  AppNavbar,
  MobileBottomNav,
} from "@/app/dashboard/_components/AppNavbar";
import { DashboardGuard } from "@/app/dashboard/_components/DashboardGuard";
import { DashboardLoader } from "@/app/dashboard/_components/DashboardLoader";
import { ReactQueryProvider } from "@/providers/query-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) return <DashboardLoader />;

  return (
    <ReactQueryProvider>
      <DashboardGuard>
        <div className="h-svh overflow-hidden bg-muted p-2 lg:p-3">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background">
            <AppNavbar />
            <main className="flex flex-1 justify-center overflow-y-auto p-3 scrollbar-none md:overflow-hidden md:p-4">
              <div className="h-full w-full max-w-7xl">{children}</div>
            </main>
            <MobileBottomNav
              role={user.role ?? "player"}
              className="md:hidden"
            />
          </div>
        </div>
      </DashboardGuard>
    </ReactQueryProvider>
  );
}
