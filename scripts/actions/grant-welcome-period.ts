/**
 * Grants a club N months (1-7) of free "welcome" time — an eventuality,
 * grace extension, or marketing gesture, for ANY club regardless of its
 * current billing status (ACTIVE, PAST_DUE, CANCELLED, whatever). Thin
 * wrapper around core/billing/services/membership.service.ts's
 * grantWelcomePeriod, same style as activate-free-plan.ts's own wrapper
 * around activateFreePlan.
 *
 * Refuses to touch a club that already has a real (or real-attempt)
 * Mercado Pago subscription unless `force` is true — a net against
 * accidentally granting free time to an actively-charging paying club via
 * a mistyped clubId. DATABASE_URL is expected to already be set
 * (scripts/menu.ts loads it from the chosen .env file before calling this).
 */
import { log, withSpinner } from "../lib/prompt";

export async function grantWelcomePeriodForClub(
  clubId: string,
  months: number,
  force: boolean,
): Promise<void> {
  const { prisma } = await import("../../infrastructure/db/client");
  const { grantWelcomePeriod, ClubNotFoundError, RealSubscriptionExistsError } =
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

    await withSpinner(`Granting ${months} free month(s) to ${club.name}…`, () =>
      grantWelcomePeriod({ clubId, months, force }),
    );

    log.success(
      `${club.name} now has ${months} free month(s), effective immediately.`,
    );
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
