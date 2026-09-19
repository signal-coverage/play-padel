"use client";

import { BouncingBall } from "@/components/BouncingBall";
import { Button } from "@/components/ui/button";
import { StatusBox } from "@/components/StatusBox";
import type { ConfirmedPanelProps } from "./types";

// Shown once the membership subscription's status is ACTIVE or TRIALING —
// per spec's "UI Label Reflects Confirmed Payment State". This is a Dialog
// (not a browser tab), so "auto-close" from that spec requirement is
// satisfied by the modal's own confirmed state simply replacing the
// checkout wizard in place; the owner still explicitly dismisses via Close.
// `isTrialing` swaps the copy to make clear no payment has actually been
// taken yet — true for either billing cycle, since both are now an
// authorized-but-uncharged Mercado Pago preapproval until the trial ends.
export function ConfirmedPanel({
  onClose,
  isTrialing,
  onChangePlan,
  isChangingPlan,
  changePlanError,
}: ConfirmedPanelProps) {
  return (
    <StatusBox className="flex flex-col items-center gap-3 py-12">
      <BouncingBall size={32} amplitude={12} />
      <p className="text-base font-semibold text-foreground">
        {isTrialing ? "Free Trial Active" : "Membership Active"}
      </p>
      <p>
        {isTrialing
          ? "Your free trial is active. No payment has been made yet."
          : "Your membership payment is confirmed."}
      </p>
      {isTrialing && onChangePlan && (
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onChangePlan}
            disabled={isChangingPlan}
          >
            {isChangingPlan ? "Changing plan..." : "Change Plan"}
          </Button>
          {changePlanError && (
            <p className="text-sm text-destructive">{changePlanError}</p>
          )}
        </div>
      )}
      <Button type="button" onClick={onClose}>
        Close
      </Button>
    </StatusBox>
  );
}
