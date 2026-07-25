"use client";

import { OwnerOnlyGuard } from "@/app/dashboard/_components/OwnerOnlyGuard";
import { ClubSettingsView } from "./_components/ClubSettingsView";

export default function ClubSettingsPage() {
  return (
    <OwnerOnlyGuard>
      <ClubSettingsView />
    </OwnerOnlyGuard>
  );
}
