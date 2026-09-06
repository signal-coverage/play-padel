"use client";

import { useAuth } from "@/hooks/use-auth";
import { OwnerOnlyGuard } from "@/app/dashboard/_components/OwnerOnlyGuard";
import { ClubSettingsTabs } from "./_components/ClubSettingsTabs";
import { AdminClubSettingsView } from "./_components/AdminClubSettingsView";

// Additive, checked BEFORE OwnerOnlyGuard below — same idiom as
// DashboardHome.tsx's `if (user.isAdmin) return <AdminDashboardHome />`: an
// admin sees the platform-wide club picker regardless of their own role
// (role === "player" AND isAdmin === true both hold at once — see
// prisma/schema.prisma's UserProfile.isAdmin comment). The
// OwnerOnlyGuard/ClubSettingsTabs branch below is completely untouched,
// still reachable exactly as before by anyone with isAdmin: false.
export default function ClubSettingsPage() {
  const { user, profileLoading } = useAuth();

  if (profileLoading) return null;

  if (user?.isAdmin) {
    return <AdminClubSettingsView />;
  }

  return (
    <OwnerOnlyGuard>
      <ClubSettingsTabs />
    </OwnerOnlyGuard>
  );
}
