"use client";

import { useState } from "react";
import { PlanSelectionModal } from "@/components/PlanSelectionModal";
import { useReactivateMembershipSubscription } from "@/components/PlanSelectionModal/hooks";
import { GateScreen } from "../GateScreen";

// Cause B from spec's club-operational-gate-overlay domain: Club.status is
// not ACTIVE, because the membership subscription reached the terminal
// CANCELLED state. Clicking "Renew membership" resets that subscription
// back to PENDING (POST /api/clubs/membership/reactivate ->
// reactivateCancelledSubscription) and then opens the same
// `PlanSelectionModal` a first-time owner sees mid-checkout — the owner
// picks a plan and pays exactly like a first-time signup. `Club.status`
// stays INACTIVE (so this gate keeps rendering underneath the modal) until
// a real charge later confirms via the existing membership webhook path.
export function ClubInactiveCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const reactivate = useReactivateMembershipSubscription();

  async function handleRenew() {
    try {
      await reactivate.mutateAsync();
      setIsModalOpen(true);
    } catch {
      // Surfaced below via reactivate.error — nothing further to do here.
    }
  }

  return (
    <>
      <GateScreen
        title="Renew your membership"
        description="Your club membership isn't active. Renew it to keep managing courts and accepting reservations."
        submitLabel={reactivate.isPending ? "Preparing…" : "Renew membership"}
        submitDisabled={reactivate.isPending}
        onSubmit={handleRenew}
      >
        {reactivate.isError ? (
          <p className="text-sm text-destructive">
            {reactivate.error instanceof Error
              ? reactivate.error.message
              : "Something went wrong. Please try again."}
          </p>
        ) : null}
      </GateScreen>
      <PlanSelectionModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
