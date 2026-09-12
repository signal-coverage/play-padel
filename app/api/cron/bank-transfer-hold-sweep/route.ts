import { NextResponse } from "next/server";
import * as React from "react";
import { render } from "@react-email/render";
import { prisma } from "@/infrastructure/db/client";
import { dispatch } from "@/lib/notifications/dispatcher";
import { BankTransferHoldExpired } from "@/lib/email/templates/BankTransferHoldExpired";
import { logSystemJob } from "@/core/systemJobs/services/systemJobs.service";

// Triggered by Vercel Cron (see vercel.json). Not a Clerk session — proxy.ts
// already allowlists /api/cron/(.*) — this bearer check is the only auth,
// same convention as membership-grace-sweep/route.ts.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Started only after the auth check passes — an unauthorized probe should
  // never pollute the system job history (see core/systemJobs).
  const startedAt = new Date();
  try {
    return await runSweep(startedAt);
  } catch (err) {
    await logSystemJob({
      kind: "CRON",
      name: "bank-transfer-hold-sweep",
      status: "FAILURE",
      startedAt,
      finishedAt: new Date(),
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// Only ever adds the expiryNotifiedAt stamp + sends one email per row — never
// touches status or any invoice. A lapsed TRANSFER hold is ignored by every
// conflict/availability check already (see reservations.service.ts), exactly
// like a lapsed Mercado Pago hold; this sweep exists solely to guarantee the
// player gets told, since nothing else in the app proactively looks at a
// reservation once its owner stops looking at it.
async function runSweep(startedAt: Date): Promise<NextResponse> {
  const now = new Date();

  const lapsedHolds = await prisma.reservation.findMany({
    where: {
      status: "SCHEDULED",
      paymentMethod: "TRANSFER",
      paymentExpiresAt: { lt: now },
      expiryNotifiedAt: null,
    },
    select: {
      id: true,
      userId: true,
      userName: true,
      courtName: true,
      scheduledStart: true,
    },
  });

  let notified = 0;
  let failed = 0;

  for (const reservation of lapsedHolds) {
    try {
      const user = await prisma.userProfile.findUnique({
        where: { id: reservation.userId },
        select: { email: true, displayName: true },
      });
      const userName = user?.displayName ?? reservation.userName;

      const html = await render(
        React.createElement(BankTransferHoldExpired, {
          userName,
          courtName: reservation.courtName,
          scheduledStart: reservation.scheduledStart,
        }),
      );

      await dispatch({
        type: "RESERVATION_PAYMENT_HOLD_EXPIRED",
        clubId: null,
        recipientId: reservation.userId,
        recipientEmail: user?.email ?? null,
        recipientName: userName,
        subject: "Your reservation hold expired",
        html,
      });

      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { expiryNotifiedAt: now },
      });
      notified++;
    } catch {
      failed++;
    }
  }

  await logSystemJob({
    kind: "CRON",
    name: "bank-transfer-hold-sweep",
    status: "SUCCESS",
    startedAt,
    finishedAt: new Date(),
  });

  return NextResponse.json({ notified, failed });
}
