/**
 * Activates the hidden, admin-only "FREE" membership tier for a club, so
 * its dashboard is unblocked for internal testing without a real Mercado
 * Pago subscription. Wraps core/billing/services/membership.service.ts's
 * activateFreePlan — the same function behind POST
 * /api/admin/membership-free-plan, which both the legacy /admin/club-status
 * page and AdminClubSettingsView's "Activate free plan" button call.
 *
 * Refuses to touch a club that already has a real (or real-attempt)
 * Mercado Pago subscription unless `force` is true — a net against
 * accidentally converting a real paying club to FREE via a mistyped
 * clubId. DATABASE_URL is expected to already be set (scripts/menu.ts
 * loads it from the chosen .env file before calling this).
 */
import { log, withSpinner } from "../lib/prompt";

export async function activateFreePlanForClub(
  clubId: string,
  force: boolean,
): Promise<void> {
  const { prisma } = await import("../../infrastructure/db/client");
  const { activateFreePlan, ClubNotFoundError, RealSubscriptionExistsError } =
    await import("../../core/billing/services/membership.service");

  try {
    const club = await withSpinner("Looking up club…", () =>
      prisma.club.findUnique({
        where: { id: clubId },
        select: { name: true },
      }),
    );

    if (!club) {
      log.error(`No club found for id ${clubId}.`);
      return;
    }

    await withSpinner(`Activating the FREE plan for ${club.name}…`, () =>
      activateFreePlan({ clubId, force }),
    );

    log.success(`${club.name} is now on the FREE plan and operational.`);
  } catch (err) {
    if (err instanceof ClubNotFoundError) {
      log.error(err.message);
    } else if (err instanceof RealSubscriptionExistsError) {
      log.error(err.message);
      log.message("Re-run and choose to override, if you're sure.");
    } else {
      log.error("Unexpected error:");
      console.error(err);
    }
  } finally {
    await prisma.$disconnect();
  }
}
