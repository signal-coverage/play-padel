"use client";

import { OwnerOnlyGuard } from "@/app/dashboard/_components/OwnerOnlyGuard";
import { CourtsView } from "./_components/CourtsView";

export default function CourtsPage() {
  return (
    <OwnerOnlyGuard>
      <CourtsView />
    </OwnerOnlyGuard>
  );
}
