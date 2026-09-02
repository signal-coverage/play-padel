"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanSelectionModal } from "@/components/PlanSelectionModal";
import type { UpgradeMembershipButtonProps } from "./types";

// Dashboard home's "Upgrade" trigger — per spec's "Upgrade Button Opens
// Shared Plan-Selection Component", clicking it opens the same shared
// `PlanSelectionModal` used by PaymentActivationScreen, in place, instead
// of navigating to /dashboard/settings/club. Split into its own component
// (rather than inlined in DashboardHome.tsx) so it can own its modal-open
// state and be unit-tested in isolation, without needing to mount
// DashboardHome's much larger, data-heavy component tree.
export function UpgradeMembershipButton({
  className,
}: UpgradeMembershipButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        className={className}
        onClick={() => setIsModalOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        Upgrade
      </Button>
      <PlanSelectionModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
