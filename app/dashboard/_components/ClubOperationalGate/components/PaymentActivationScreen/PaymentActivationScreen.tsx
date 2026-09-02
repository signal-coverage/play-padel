"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBox } from "@/components/StatusBox";
import { PlanSelectionModal } from "@/components/PlanSelectionModal";
import { useMembershipSubscription } from "@/components/PlanSelectionModal/hooks";
import { isMembershipConfirmed } from "@/components/PlanSelectionModal/utils";
import { MERCADOPAGO_CONNECT_URL } from "../../consts";
import { GateScreen } from "../GateScreen";
import { MEMBERSHIP_STATUS_LABELS } from "./consts";

// Cause A from spec's club-operational-gate-overlay domain: club finished
// registration but membership payment isn't confirmed yet — replaces the
// old McNotConnectedCard. Rendered directly as the dashboard's
// page-content when this cause is active (not a dialog), so it also
// surfaces the "Pay Membership" action (opens the shared
// `PlanSelectionModal`) before letting the owner link Mercado Pago, since
// spec's "Two Separate Membership Actions" requires both a confirmed
// membership payment AND a connected account before reservations can be
// accepted.
export function PaymentActivationScreen() {
  const {
    data: subscription,
    isLoading,
    isError,
    refetch,
  } = useMembershipSubscription();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isConfirmed = subscription
    ? isMembershipConfirmed(subscription.status)
    : false;
  const isBusy = isLoading;

  function handleLinkMercadoPago() {
    window.location.href = MERCADOPAGO_CONNECT_URL;
  }

  return (
    <GateScreen
      title="Payment activation"
      description="Your club needs an active membership and a connected Mercado Pago account before it can start accepting reservations."
      submitLabel="Link Mercado Pago account"
      submitDisabled={isBusy || isError || !isConfirmed}
      onSubmit={handleLinkMercadoPago}
    >
      <div className="flex flex-col gap-4 px-2 py-4">
        {isError ? (
          <StatusBox className="flex flex-col items-center justify-center gap-3 py-16">
            <p>We couldn&apos;t load your membership. Try again.</p>
            <Button type="button" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </StatusBox>
        ) : isLoading || !subscription ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-md border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {subscription.plan} ·{" "}
                {subscription.cycle === "MONTHLY" ? "Monthly" : "Annual"}
              </p>
              <p className="text-xs text-muted-foreground">
                Status: {MEMBERSHIP_STATUS_LABELS[subscription.status]}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={isConfirmed}
              variant={isConfirmed ? "outline" : "default"}
            >
              {isConfirmed ? "Membership Active" : "Pay Membership"}
            </Button>
          </div>
        )}
      </div>

      <PlanSelectionModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </GateScreen>
  );
}
