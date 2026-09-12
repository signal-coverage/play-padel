"use client";

import { OwnerOnlyGuard } from "@/app/dashboard/_components/OwnerOnlyGuard";
import { TournamentsManager } from "./_components/TournamentsManager";

export default function TournamentsPage() {
  return (
    <OwnerOnlyGuard>
      <TournamentsManager />
    </OwnerOnlyGuard>
  );
}
