"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { track } from "@vercel/analytics";
import { track as trackAmplitude } from "@amplitude/unified";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fireSuccessConfetti } from "@/lib/utils/confetti";
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
      fireSuccessConfetti();
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
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <div>
          <p className="font-medium">Confirming your payment…</p>
          <p className="text-sm text-muted-foreground">
            This usually takes a few seconds.
          </p>
        </div>
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
