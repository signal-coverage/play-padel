"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils/planPricing";
import { CardTokenForm } from "../CardTokenForm";
import type { CardCollectionPanelProps } from "./types";

// MONTHLY-only step: collect a payer email, then hand off to the
// `CardTokenForm` Brick wrapper to obtain a `cardTokenId` — the two fields
// `createMembershipPreapproval` (Phase 2) requires before it can create an
// already-authorized preapproval. The Brick only renders once an email is
// present so its `initialization.payer.email` is always meaningful instead
// of prefilled with nothing.
export function CardCollectionPanel({
  amount,
  payerEmail,
  errorMessage,
  isSubmitting,
  onPayerEmailChange,
  onTokenReady,
  onCardError,
  onBack,
}: CardCollectionPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {formatCurrency(amount)} / month — provide your card details below to
        start your membership.
      </p>

      <div className="flex flex-col gap-1">
        <Label htmlFor="plan-selection-payer-email">Email</Label>
        <Input
          id="plan-selection-payer-email"
          type="email"
          value={payerEmail}
          onChange={(event) => onPayerEmailChange(event.target.value)}
          placeholder="owner@club.com"
        />
      </div>

      {payerEmail ? (
        <CardTokenForm
          amount={amount}
          payerEmail={payerEmail}
          onTokenReady={onTokenReady}
          onError={onCardError}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          Enter your email to continue to card details.
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
