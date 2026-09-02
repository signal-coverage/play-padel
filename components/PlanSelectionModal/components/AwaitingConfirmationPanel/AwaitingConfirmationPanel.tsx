"use client";

import { BouncingBall } from "@/components/BouncingBall";
import { Button } from "@/components/ui/button";
import { StatusBox } from "@/components/StatusBox";
import type { AwaitingConfirmationPanelProps } from "./types";

// Shown after a checkout attempt (ANNUAL's hosted-preference tab, or
// MONTHLY's no-trial preapproval) while waiting for the membership webhook
// to confirm payment — per spec's "Webhook-Only State Confirmation", no
// client action here ever advances the actual membership status; "Check
// again" only re-fetches the current snapshot, it never fakes confirmation.
export function AwaitingConfirmationPanel({
  onRefresh,
  isRefreshing,
  openedExternalTab,
}: AwaitingConfirmationPanelProps) {
  return (
    <StatusBox className="flex flex-col items-center gap-3 py-12">
      <BouncingBall size={32} amplitude={16} />
      <p>
        We&apos;re confirming your payment with Mercado Pago. This usually takes
        less than a minute.
      </p>
      {openedExternalTab && (
        <p className="text-xs text-muted-foreground">
          We&apos;ll close the Mercado Pago tab automatically once your payment
          is confirmed. If it stays open, you can close that tab yourself.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        Check again
      </Button>
    </StatusBox>
  );
}
