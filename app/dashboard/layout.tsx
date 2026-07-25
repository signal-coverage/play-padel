"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/dashboard/_components/AppSidebar";
import { AppHeader } from "@/app/dashboard/_components/AppHeader";
import { DashboardGuard } from "@/app/dashboard/_components/DashboardGuard";
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

  if (loading || !user) return null;

  return (
    <ReactQueryProvider>
      <DashboardGuard>
        <SidebarProvider className="bg-sidebar">
          <AppSidebar />
          <div className="h-svh overflow-hidden lg:p-2 w-full">
            <div className="lg:border lg:rounded-xl overflow-hidden flex flex-col bg-background h-full w-full">
              <AppHeader />
              <main className="flex-1 overflow-y-auto p-4 md:p-6">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </DashboardGuard>
    </ReactQueryProvider>
  );
}
