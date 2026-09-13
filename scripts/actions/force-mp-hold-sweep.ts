/**
 * Manually triggers the exact same Mercado Pago hold-expiry sweep the daily
 * cron runs (see core/reservations/services/mercadoPagoHoldSweep.service.ts
 * and app/api/cron/mercadopago-hold-sweep/route.ts) — useful for testing the
 * expiry-email flow, or for not waiting out the cron's own once-a-day
 * schedule after fixing something that was blocking it.
 *
 * DATABASE_URL is expected to already be set (scripts/menu.ts loads it from
 * the chosen .env file before calling this) — this module never picks an
 * environment on its own.
 */
import { log, withSpinner } from "../lib/prompt";

export async function forceMercadoPagoHoldSweep(): Promise<void> {
  const { prisma } = await import("../../infrastructure/db/client");
  const { sweepLapsedMercadoPagoHolds } =
    await import("../../core/reservations/services/mercadoPagoHoldSweep.service");

  try {
    const { notified, failed } = await withSpinner(
      "Sweeping lapsed Mercado Pago holds…",
      () => sweepLapsedMercadoPagoHolds(),
    );

    if (notified === 0 && failed === 0) {
      log.info("No lapsed, un-notified Mercado Pago holds found.");
      return;
    }

    log.success(`Notified ${notified} player(s) of an expired hold.`);
    if (failed > 0) {
      log.warn(
        `${failed} row(s) failed (notification error or unexpected exception) — check server logs for details.`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
