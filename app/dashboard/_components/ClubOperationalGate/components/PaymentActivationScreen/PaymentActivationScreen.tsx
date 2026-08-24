"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBox } from "@/components/StatusBox";
import type { Plan } from "@/core/clubs/types";
import { MERCADOPAGO_CONNECT_URL } from "../../consts";
import { GateScreen } from "../GateScreen";
import { useClubPlan, useUpdateClubPlan } from "./hooks";
import { BillingCycleToggle } from "./components/BillingCycleToggle";
import type { BillingCycle } from "./components/BillingCycleToggle/types";
import { PlanOptionCard } from "./components/PlanOptionCard";

const PLAN_ORDER: Plan[] = ["BASIC", "PRO", "PLUS", "MAX"];

// Cause A from spec's club-operational-gate-overlay domain: club finished
// registration + plan payment but never connected Mercado Pago — replaces
// the old McNotConnectedCard. Rendered directly as the dashboard's
// page-content when this cause is active (not a dialog), so it also lets
// the owner change their plan before linking Mercado Pago, since both an
// active plan and a connected account are required to accept reservations.
export function PaymentActivationScreen() {
  const { data: currentPlan, isLoading, isError, refetch } = useClubPlan();
  const updateClubPlan = useUpdateClubPlan();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  // Preview-only toggle, mirroring PlanStep.tsx's onboarding version — it
  // only changes which price PlanOptionCard shows for each tier. Not
  // persisted anywhere: there is no billingCycle field on the Club model or
  // in the PATCH /api/clubs schema.
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  // Tracks the last `currentPlan` value we've already synced into
  // selectedPlan, so the render-time sync below only fires once per actual
  // change instead of clobbering the owner's in-progress selection.
  const [syncedPlan, setSyncedPlan] = useState<Plan | null>(null);
  const cardRefs = useRef<Partial<Record<Plan, HTMLButtonElement | null>>>({});

  // Seed (and re-sync) the locally-selected plan once the club's actual
  // plan loads. Adjusted during render rather than in a useEffect — this is
  // React's documented pattern for mirroring an external value into state
  // ("Adjusting state based on a prop/query change"), and it avoids the
  // extra commit-then-effect render pass a setState-in-effect would cause.
  // Until this fires, selectedPlan stays null and the grid/footer render a
  // loading state instead of guessing a default.
  if (currentPlan && currentPlan !== syncedPlan) {
    setSyncedPlan(currentPlan);
    setSelectedPlan(currentPlan);
  }

  // Roving-tabindex arrow-key navigation for the radiogroup below (ARIA APG
  // "listbox / radio group" pattern: arrow keys move selection, the group
  // is a single Tab stop). Moves both the selection state and DOM focus
  // together, since PlanOptionCard's tabIndex is derived from isSelected.
  function handleGroupKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!selectedPlan) return;
    const currentIndex = PLAN_ORDER.indexOf(selectedPlan);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % PLAN_ORDER.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + PLAN_ORDER.length) % PLAN_ORDER.length;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const nextPlan = PLAN_ORDER[nextIndex];
    setSelectedPlan(nextPlan);
    cardRefs.current[nextPlan]?.focus();
  }

  async function handleSubmit() {
    if (!selectedPlan) return;
    try {
      if (selectedPlan !== currentPlan) {
        await updateClubPlan.mutateAsync(selectedPlan);
      }
      window.location.href = MERCADOPAGO_CONNECT_URL;
    } catch {
      // useUpdateClubPlan already surfaces the error via toast.error;
      // swallow here so navigation simply doesn't happen.
    }
  }

  const isBusy = isLoading || updateClubPlan.isPending;

  return (
    <GateScreen
      title="Payment activation"
      description="Your club needs an active plan and a connected Mercado Pago account before it can start accepting reservations."
      contentClassName="max-w-6xl"
      submitLabel={
        updateClubPlan.isPending ? "Linking…" : "Link Mercado Pago account"
      }
      submitDisabled={isBusy || isError || !selectedPlan}
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-4 px-2 py-4">
        <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />

        {isError ? (
          <StatusBox className="flex flex-col items-center justify-center gap-3 py-16">
            <p>We couldn&apos;t load your plan. Try again.</p>
            <Button type="button" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </StatusBox>
        ) : isLoading || !selectedPlan ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_ORDER.map((plan) => (
              <Skeleton key={plan} className="h-80 w-full" />
            ))}
          </div>
        ) : (
          <div
            role="radiogroup"
            aria-label="Plan"
            onKeyDown={handleGroupKeyDown}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {PLAN_ORDER.map((plan, index) => (
              <PlanOptionCard
                key={plan}
                ref={(el) => {
                  cardRefs.current[plan] = el;
                }}
                plan={plan}
                isSelected={plan === selectedPlan}
                billingCycle={billingCycle}
                onSelect={setSelectedPlan}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </GateScreen>
  );
}
