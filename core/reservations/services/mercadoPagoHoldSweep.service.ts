import { prisma } from "@/infrastructure/db/client";
import { dispatch } from "@/lib/notifications/dispatcher";
import { MP_HOLD_EXPIRY_ACTOR } from "@/core/reservations/consts";

export type MercadoPagoHoldSweepResult = {
  notified: number;
  failed: number;
};

/**
 * Backstop for the lazy-expiry mechanism in reservations.service.ts: that
 * mechanism only fires the next time some read path (My Reservations, the
 * owner's reservation list/detail, a stream poll) actually touches the row —
 * a hold nobody ever comes back to look at would otherwise linger SCHEDULED
 * forever. Extracted from app/api/cron/mercadopago-hold-sweep/route.ts (the
 * daily Vercel Cron caller) so scripts/actions/force-mp-hold-sweep.ts can
 * trigger the exact same sweep on demand, without duplicating this logic or
 * routing a manual CLI run through the cron's own bearer-token HTTP auth.
 */
export async function sweepLapsedMercadoPagoHolds(): Promise<MercadoPagoHoldSweepResult> {
  const now = new Date();

  const lapsedHolds = await prisma.reservation.findMany({
    where: {
      status: "SCHEDULED",
      paymentMethod: "MERCADOPAGO",
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

      await dispatch({
        type: "RESERVATION_PAYMENT_HOLD_EXPIRED",
        clubId: null,
        recipientId: reservation.userId,
        recipientEmail: user?.email ?? null,
        recipientName: userName,
        params: {
          variant: "mercadoPago",
          userName,
          courtName: reservation.courtName,
          scheduledStart: reservation.scheduledStart.toISOString(),
        },
      });

      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelledBy: MP_HOLD_EXPIRY_ACTOR,
          updatedBy: MP_HOLD_EXPIRY_ACTOR,
          expiryNotifiedAt: now,
        },
      });
      notified++;
    } catch {
      failed++;
    }
  }

  return { notified, failed };
}
