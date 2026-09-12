/**
 * Resolves an ACTIVE club by its OWNER's email — the shared lookup behind
 * scripts/menu.ts's club-identification prompt, used by both the
 * activate-free-plan and grant-welcome-period flows so an admin never has
 * to go copy a raw clubId out of the database first. Only a `role: "owner"`
 * UserProfile row ever carries a `clubId` (players don't belong to a club),
 * same lookup shape as core/clubs/services/clubs.service.ts's own
 * getClubOwner (the inverse direction: clubId -> owner, not email -> clubId).
 *
 * Requires `Club.status === "ACTIVE"` — the database never actually deletes
 * a Club row when its owner deletes their account (see anonymizeUserProfile
 * in core/users/services/users.service.ts, which only scrubs the
 * UserProfile), so an email match alone could otherwise resolve straight to
 * a defunct club's stale row.
 *
 * DATABASE_URL is expected to already be set (scripts/menu.ts loads it from
 * the chosen .env file before calling this).
 */
export async function resolveClubIdByEmail(
  email: string,
): Promise<{ clubId: string; clubName: string } | null> {
  const { prisma } = await import("../../infrastructure/db/client");

  try {
    const owner = await prisma.userProfile.findFirst({
      where: { email, role: "owner" },
      select: { clubId: true },
    });
    if (!owner?.clubId) return null;

    const club = await prisma.club.findUnique({
      where: { id: owner.clubId },
      select: { name: true, status: true },
    });
    if (!club || club.status !== "ACTIVE") return null;

    return { clubId: owner.clubId, clubName: club.name };
  } finally {
    await prisma.$disconnect();
  }
}
