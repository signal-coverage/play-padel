"use client";

import { useAuth } from "@/hooks/use-auth";
import { OwnerOnlyGuard } from "@/app/dashboard/_components/OwnerOnlyGuard";
import { TournamentsManager } from "./_components/TournamentsManager";
import { AdminTournamentsView } from "./_components/AdminTournamentsView";

// Additive, checked BEFORE OwnerOnlyGuard below: an admin sees the
// platform-wide club picker regardless of their own role (role === "player"
// AND isAdmin === true both hold at once — see prisma/schema.prisma's
// UserProfile.isAdmin comment) — same branch shape as
// app/dashboard/settings/club/page.tsx's ClubSettingsPage. The
// OwnerOnlyGuard/TournamentsManager branch below is untouched, still
// reachable exactly as before by anyone with isAdmin: false.
export default function TournamentsPage() {
  const { user, profileLoading } = useAuth();

  if (profileLoading) return null;

  if (user?.isAdmin) {
    return <AdminTournamentsView />;
  }

  return (
    <OwnerOnlyGuard>
      <TournamentsManager />
    </OwnerOnlyGuard>
  );
}
