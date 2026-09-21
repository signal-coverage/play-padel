"use client";

import { useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidEmail } from "./utils";
import type { CardCollectionPanelProps } from "./types";

// Collect a payer email inside
// MembershipCheckoutDrawer's Sheet, above where the Mercado Pago card form
// reveals once verified (see that component). The input locks once
// verified — `payerEmail` also controls whether the card form is showing,
// so an unverified in-progress edit here must never leak into it; "Change
// email" explicitly re-opens editing (and, via `onPayerEmailChange("")`,
// hides the card form again).
export function CardCollectionPanel({
  payerEmail,
  defaultEmail,
  onPayerEmailChange,
}: CardCollectionPanelProps) {
  const t = useTranslations("CardCollectionPanel");
  // Pre-fills from the owner's own account email — falls back to
  // `payerEmail` (empty on first mount) only so re-mounting after "Change
  // email" doesn't lose whatever the field held. Seeded once at mount, not
  // synced on every render: React's own state-lives-until-remount rule
  // means later edits to `defaultEmail` (there generally aren't any — this
  // is the owner's own account email) wouldn't clobber a draft they've
  // already started typing over.
  const [draftEmail, setDraftEmail] = useState(
    payerEmail || defaultEmail || "",
  );
  const isVerified = payerEmail !== "";
  const canVerify = !isVerified && isValidEmail(draftEmail);

  function handleVerify() {
    if (!canVerify) return;
    onPayerEmailChange(draftEmail.trim());
  }

  function handleChangeEmail() {
    onPayerEmailChange("");
  }

  function handleEmailKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleVerify();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label htmlFor="plan-selection-payer-email">{t("emailLabel")}</Label>
        <Input
          className="rounded-sm"
          id="plan-selection-payer-email"
          type="email"
          value={isVerified ? payerEmail : draftEmail}
          onChange={(event) => setDraftEmail(event.target.value)}
          onKeyDown={handleEmailKeyDown}
          placeholder={t("emailPlaceholder")}
          disabled={isVerified}
          autoFocus
        />
      </div>

      {isVerified ? (
        <Button
          type="button"
          variant="outline"
          className="self-start rounded-sm"
          onClick={handleChangeEmail}
        >
          {t("changeEmail")}
        </Button>
      ) : (
        <Button
          type="button"
          className="self-start rounded-sm"
          onClick={handleVerify}
          disabled={!canVerify}
        >
          {t("verify")}
        </Button>
      )}
    </div>
  );
}
