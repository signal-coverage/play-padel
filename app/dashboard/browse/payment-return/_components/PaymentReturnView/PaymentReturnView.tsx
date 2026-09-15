"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { track } from "@vercel/analytics";
import { track as trackAmplitude } from "@amplitude/unified";
import { BouncingBall } from "@/components/BouncingBall";
import { Button } from "@/components/ui/button";
import { fireSuccessCelebration } from "@/lib/utils/celebration";
import { usePaymentReturnStatus } from "./hooks";

export function PaymentReturnView({
  reservationId,
}: {
  reservationId: string | null;
}) {
  const t = useTranslations("PaymentReturnView");
  const { state, isLoading } = usePaymentReturnStatus(reservationId);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (state !== "success") return;
    track("payment_confirmed");
    trackAmplitude("payment_confirmed");
    if (!shouldReduceMotion) {
      fireSuccessCelebration();
    }
  }, [state, shouldReduceMotion]);

  // Single persistent live region: stays mounted across every branch below
  // and only its text changes, so screen readers reliably announce the
  // processing → success/failed transition (mirrors the pattern already
  // used in MyReservations and CourtAvailabilityGrid, instead of relying on
  // content that mounts/unmounts with the state itself).
  const statusMessage = !reservationId
    ? t("missingReference")
    : isLoading || state === "processing"
      ? t("confirmingPayment")
      : state === "success"
        ? t("paymentConfirmedStatus")
        : state === "error"
          ? t("checkFailedStatus")
          : t("paymentFailedStatus");

  let content: React.ReactNode;
  let contentKey: string;

  if (!reservationId) {
    contentKey = "missing";
    content = (
      <>
        <BouncingBall
          size={40}
          amplitude={14}
          fill="var(--destructive)"
          stroke="color-mix(in oklch, var(--destructive) 70%, black)"
        />
        <p className="text-sm text-muted-foreground">{t("missingReference")}</p>
        <Button asChild>
          <Link href="/dashboard/browse">{t("backToBrowse")}</Link>
        </Button>
      </>
    );
  } else if (isLoading || state === "processing") {
    contentKey = "processing";
    content = (
      <>
        <BouncingBall size={32} amplitude={16} />
        <div>
          <p className="font-medium">{t("confirmingPayment")}</p>
          <p className="text-sm text-muted-foreground">
            {t("confirmingPaymentHint")}
          </p>
        </div>
      </>
    );
  } else if (state === "error") {
    // OUR OWN backend call failed (see hooks.ts's `query.isError` check) —
    // distinct from "failed" (a genuine, settled payment/hold outcome).
    // The player can't self-diagnose a platform bug, and unlike an owner
    // (who'd contact Play Padel support directly, see PlanSelectionModal's
    // resolveCheckoutErrorMessage), a player's direct point of contact is
    // the club itself — the club can look up the reservation/charge
    // through its own dashboard and escalate to Play Padel if needed.
    contentKey = "error";
    content = (
      <>
        <BouncingBall
          size={40}
          amplitude={14}
          fill="var(--destructive)"
          stroke="color-mix(in oklch, var(--destructive) 70%, black)"
        />
        <div>
          <p className="font-medium">{t("checkFailedTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("contactClub")}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/my-reservations">
            {t("viewMyReservations")}
          </Link>
        </Button>
      </>
    );
  } else if (state === "success") {
    contentKey = "success";
    content = (
      <>
        <BouncingBall size={40} amplitude={14} />
        <div>
          <p className="font-medium">{t("paymentConfirmedTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("reservationBooked")}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/my-reservations">
            {t("viewMyReservations")}
          </Link>
        </Button>
      </>
    );
  } else {
    contentKey = "failed";
    content = (
      <>
        <BouncingBall
          size={40}
          amplitude={14}
          fill="var(--destructive)"
          stroke="color-mix(in oklch, var(--destructive) 70%, black)"
        />
        <div>
          <p className="font-medium">{t("paymentFailedTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("slotHoldExpired")}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/browse">{t("backToBrowse")}</Link>
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span role="status" className="sr-only">
        {statusMessage}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={contentKey}
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col items-center gap-4"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
