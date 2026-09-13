/**
 * Prints a one-shot "club health check" report — status, plan, Mercado Pago
 * connection, membership subscription, operating hours, court count — for
 * quick support/diagnostic use without having to open the in-app admin
 * dashboard. Reuses listAllClubs' own health-flag computation
 * (core/clubs/services/clubs.service.ts) rather than re-deriving it, so this
 * report can never silently drift from what the admin picker itself shows.
 *
 * DATABASE_URL is expected to already be set (scripts/menu.ts loads it from
 * the chosen .env file before calling this) — this module never picks an
 * environment on its own.
 */
import { log, note, withSpinner } from "../lib/prompt";

export async function describeClub(clubId: string): Promise<void> {
  const { prisma } = await import("../../infrastructure/db/client");
  const { listAllClubs } =
    await import("../../core/clubs/services/clubs.service");
  const { getClubOperationalStatus } =
    await import("../../lib/mercadopago/operationalStatus");

  try {
    const club = await withSpinner("Looking up club…", async () => {
      const clubs = await listAllClubs();
      return clubs.find((c) => c.id === clubId) ?? null;
    });

    if (!club) {
      log.error(`No club found for id ${clubId}.`);
      return;
    }

    const [operational, courtCount] = await Promise.all([
      getClubOperationalStatus(clubId),
      prisma.court.count({ where: { clubId, deletedAt: null } }),
    ]);

    const lines = [
      `Status:          ${club.status}`,
      `Plan:            ${club.plan}${club.isFreePlan ? " (FREE testing tier)" : ""}`,
      `Court limit:     ${club.courtLimit ?? "unlimited"}`,
      `Courts:          ${courtCount}`,
      `Operational:     ${operational.operational ? "yes" : `no (${operational.cause ?? "unknown cause"})`}`,
      `Mercado Pago:    ${club.mpTokenIssue ? "⚠ issue (missing/expired/expiring token)" : "ok"}${operational.email ? ` — ${operational.email}` : ""}`,
      `Membership:      ${club.membershipPastDue ? "⚠ PAST_DUE" : "ok"}`,
      `Operating hours: ${club.noOperatingHours ? "⚠ none configured" : "configured"}`,
    ];

    note(lines.join("\n"), club.name);
  } finally {
    await prisma.$disconnect();
  }
}
