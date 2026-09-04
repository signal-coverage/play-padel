"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  AppNavbar,
  MobileBottomNav,
} from "@/app/dashboard/_components/AppNavbar";
import { ClubOperationalGate } from "@/app/dashboard/_components/ClubOperationalGate";
import { DashboardGuard } from "@/app/dashboard/_components/DashboardGuard";
import { DashboardLoader } from "@/app/dashboard/_components/DashboardLoader";
import { MercadoPagoConnectedDialog } from "@/app/dashboard/_components/MercadoPagoConnectedDialog";
import { ReactQueryProvider } from "@/providers/query-provider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [showMpConnectedDialog, setShowMpConnectedDialog] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (searchParams.get("mpConnect") !== "success") return;
    // Syncing local state with an external source (the URL) read once at
    // mount — the same class of "genuine effect" exception this repo's
    // stricter-than-default react-hooks/set-state-in-effect rule already
    // carves out in providers/auth-provider.tsx's own profile-fetch effect,
    // not a response to a React state change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowMpConnectedDialog(true);
    const params = new URLSearchParams(searchParams);
    params.delete("mpConnect");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
    // Run once on mount to consume the one-time OAuth-redirect query param;
    // re-running on every searchParams/pathname identity change (both are
    // new references per navigation) would re-open the dialog after the
    // very replace() call above changes the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !user) return <DashboardLoader />;

  return (
    <ReactQueryProvider>
      <DashboardGuard>
        <div className="h-svh overflow-hidden bg-muted p-2 lg:p-3">
          <div className="flex h-full flex-col overflow-hidden rounded-sm border border-border bg-background">
            <AppNavbar />
            <main className="flex flex-1 justify-center overflow-y-auto p-6 scrollbar-none md:overflow-hidden md:p-4 md:px-6">
              <div className="h-full w-full min-w-0 max-w-7xl">
                {user.role === "owner" ? (
                  <ClubOperationalGate>{children}</ClubOperationalGate>
                ) : (
                  children
                )}
              </div>
            </main>
            <MobileBottomNav
              role={user.role ?? "player"}
              className="min-[809px]:hidden"
            />
          </div>
        </div>
        {user.role === "owner" && (
          <MercadoPagoConnectedDialog
            open={showMpConnectedDialog}
            onOpenChange={setShowMpConnectedDialog}
          />
        )}
      </DashboardGuard>
    </ReactQueryProvider>
  );
}
