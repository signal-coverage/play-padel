"use client";

import { OwnerOnlyGuard } from "@/app/dashboard/_components/OwnerOnlyGuard";
import { ReservationsView } from "./_components/ReservationsView";

export default function ReservationsPage() {
  return (
    <OwnerOnlyGuard>
      <ReservationsView />
    </OwnerOnlyGuard>
  );
}
