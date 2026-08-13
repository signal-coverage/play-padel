"use client";

import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaymentReturnStatus } from "./hooks";

export function PaymentReturnView({
  reservationId,
}: {
  reservationId: string | null;
}) {
  const { state, isLoading } = usePaymentReturnStatus(reservationId);

  if (!reservationId) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <XCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Missing reservation reference.
        </p>
        <Button asChild>
          <Link href="/dashboard/browse">Back to Browse Courts</Link>
        </Button>
      </div>
    );
  }

  if (isLoading || state === "processing") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <div>
          <p className="font-medium">Confirming your payment…</p>
          <p className="text-sm text-muted-foreground">
            This usually takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
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
    </div>
  );
}
