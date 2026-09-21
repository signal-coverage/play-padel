"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("ConfirmedPanel");

  return (
    <StatusBox className="flex flex-col items-center gap-3 py-12">
      <BouncingBall size={32} amplitude={12} />
      <p className="text-base font-semibold text-foreground">
        {isTrialing ? t("freeTrialActive") : t("membershipActive")}
      </p>
      <p>{isTrialing ? t("trialDescription") : t("confirmedDescription")}</p>
      {isTrialing && onChangePlan && (
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onChangePlan}
            disabled={isChangingPlan}
          >
            {isChangingPlan ? t("changingPlan") : t("changePlan")}
          </Button>
          {changePlanError && (
            <p className="text-sm text-destructive">{changePlanError}</p>
          )}
        </div>
      )}
      <Button type="button" onClick={onClose}>
        {t("close")}
      </Button>
    </StatusBox>
  );
}
