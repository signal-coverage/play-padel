"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { track } from "@vercel/analytics";
import { track as trackAmplitude } from "@amplitude/unified";
import { CheckCircle2, XCircle } from "lucide-react";
import { BouncingBall } from "@/components/BouncingBall";
import { Button } from "@/components/ui/button";
import { fireSuccessCelebration } from "@/lib/utils/celebration";
import { usePaymentReturnStatus } from "./hooks";

export function PaymentReturnView({
  reservationId,
}: {
  reservationId: string | null;
}) {
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
    ? "Missing reservation reference."
    : isLoading || state === "processing"
      ? "Confirming your payment…"
      : state === "success"
        ? "Payment confirmed. Your reservation is booked."
        : state === "error"
          ? "We couldn't check your payment status. Contact the club to confirm your reservation."
          : "Payment didn't complete. Your slot hold has expired.";

  let content: React.ReactNode;
  let contentKey: string;

  if (!reservationId) {
    contentKey = "missing";
    content = (
      <>
        <XCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Missing reservation reference.
        </p>
        <Button asChild>
          <Link href="/dashboard/browse">Back to Browse Courts</Link>
        </Button>
      </>
    );
  } else if (isLoading || state === "processing") {
    contentKey = "processing";
    content = (
      <>
        <BouncingBall size={32} amplitude={16} />
        <div>
          <p className="font-medium">Confirming your payment…</p>
          <p className="text-sm text-muted-foreground">
            This usually takes a few seconds.
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
        <XCircle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-medium">We couldn&apos;t check your payment</p>
          <p className="text-sm text-muted-foreground">
            Contact the club directly to confirm your reservation.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/my-reservations">View my reservations</Link>
        </Button>
      </>
    );
  } else if (state === "success") {
    contentKey = "success";
    content = (
      <>
        <CheckCircle2 className="h-10 w-10 text-success" />
        <div>
          <p className="font-medium">Payment confirmed!</p>
          <p className="text-sm text-muted-foreground">
            Your reservation is booked.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/my-reservations">View my reservations</Link>
        </Button>
      </>
    );
  } else {
    contentKey = "failed";
    content = (
      <>
        <XCircle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-medium">Payment didn&apos;t complete</p>
          <p className="text-sm text-muted-foreground">
            Your slot hold has expired. You can try booking again.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/browse">Back to Browse Courts</Link>
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
