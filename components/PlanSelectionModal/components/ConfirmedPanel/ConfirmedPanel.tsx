"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBox } from "@/components/StatusBox";
import type { ConfirmedPanelProps } from "./types";

// Shown once the membership subscription's status is ACTIVE or TRIALING —
// per spec's "UI Label Reflects Confirmed Payment State". This is a Dialog
// (not a browser tab), so "auto-close" from that spec requirement is
// satisfied by the modal's own confirmed state simply replacing the
// checkout wizard in place; the owner still explicitly dismisses via Close.
// `isTrialing` swaps the copy to make clear no payment has actually been
// taken yet — see types.ts for why this matters most for ANNUAL trials.
// `showPayNow` additionally surfaces a "Pay Now" action for an ANNUAL
// trial — otherwise there is no way to generate the one-time payment link
// before the cron sweep cancels the trial at `trialEndsAt`.
export function ConfirmedPanel({
  onClose,
  isTrialing,
  showPayNow,
  onPayNow,
  isPayNowLoading,
  payNowError,
}: ConfirmedPanelProps) {
  return (
    <StatusBox className="flex flex-col items-center gap-3 py-12">
      <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
      <p className="text-base font-semibold text-foreground">
        {isTrialing ? "Free Trial Active" : "Membership Active"}
      </p>
      <p>
        {isTrialing
          ? "Your free trial is active. No payment has been made yet."
          : "Your membership payment is confirmed."}
      </p>
      {showPayNow && (
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onPayNow}
            disabled={isPayNowLoading}
          >
            {isPayNowLoading ? "Generating payment link..." : "Pay Now"}
          </Button>
          {payNowError && (
            <p className="text-sm text-destructive">{payNowError}</p>
          )}
        </div>
      )}
      <Button type="button" onClick={onClose}>
        Close
      </Button>
    </StatusBox>
  );
}
