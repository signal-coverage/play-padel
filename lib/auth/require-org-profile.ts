import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";

/**
 * Loads the current authenticated user's profile. `clubId` is optional on
 * `UserProfile` — only club owners belong to a club, players don't — so this
 * intentionally does NOT throw when the profile has no club. Callers that
 * require a club (e.g. owner-only routes) must check `profile.clubId`
 * themselves and reject/redirect players explicitly.
 *
 * As of this pass this helper has no callers yet (most of the app is still
 * stubbed); kept for when owner-scoped routes are built.
 */
export async function requireOrgProfile() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });
  if (!profile) throw new Error("Profile not found");

  return profile;
}
