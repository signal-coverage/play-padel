import { prisma } from "@/infrastructure/db/client";
import type { UserProfile } from "@/core/users/types";

type UserProfileRow = NonNullable<
  Awaited<ReturnType<typeof prisma.userProfile.findUnique>>
>;

function toUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    role: row.role as UserProfile["role"],
    clubId: row.clubId ?? undefined,
    displayName: row.displayName,
    email: row.email,
    photoURL: row.photoURL ?? undefined,
    phone: row.phone ?? undefined,
    preferredSide: row.preferredSide ?? undefined,
    dominantHand: row.dominantHand ?? undefined,
    status: row.status as UserProfile["status"],
    lastLogin: row.lastLogin ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const row = await prisma.userProfile.findUnique({
    where: { id: uid },
  });
  if (!row) return null;
  return toUserProfile(row);
}

export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, "id" | "createdAt" | "updatedAt">,
): Promise<UserProfile> {
  const row = await prisma.userProfile.create({
    data: { id: uid, ...data },
  });
  return toUserProfile(row);
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, "id" | "createdAt" | "createdBy">>,
  updatedBy: string,
): Promise<void> {
  await prisma.userProfile.update({
    where: { id: uid },
    data: { ...data, updatedBy },
  });
}

/**
 * Only owners belong to a club, so this only ever returns owner profiles for
 * the given club (players have clubId = null and are excluded by the where
 * clause naturally).
 */
export async function listUsersByClub(clubId: string): Promise<UserProfile[]> {
  const rows = await prisma.userProfile.findMany({
    where: { clubId },
    orderBy: { displayName: "asc" },
  });
  return rows.map(toUserProfile);
}

/**
 * Handles Clerk's `user.deleted` webhook. Argentina's Ley 25.326 derecho de
 * supresión requires honoring the delete, but a hard delete would break
 * referential integrity for any user with reservation/payment/audit-log
 * history (Reservation.userId has no cascade) — so this anonymizes the row
 * in place instead: PII is scrubbed, the row (and its id, role, clubId,
 * createdAt/createdBy, and reservations relation) survives. See
 * docs/COMPLIANCE.md.
 *
 * Uses `updateMany` (never throws on a zero-row match) rather than
 * `update`, and returns whether a row actually existed — a Clerk user who
 * signed up but never completed onboarding has no UserProfile row at all
 * (see app/api/onboarding/route.ts, the only place one is ever created), so
 * deleting that Clerk account still fires this same webhook with nothing
 * here to anonymize. `update` would throw Prisma's "No record was found for
 * an update" and 500 the whole webhook; the caller (see
 * app/api/webhooks/clerk/route.ts) uses the returned boolean to skip
 * logging a misleading audit entry for a profile that was never touched.
 */
export async function anonymizeUserProfile(
  uid: string,
  actor: string,
): Promise<boolean> {
  const result = await prisma.userProfile.updateMany({
    where: { id: uid },
    data: {
      displayName: "Deleted User",
      firstName: null,
      lastName: null,
      email: `deleted-${uid}@play-padel.invalid`,
      photoURL: null,
      phone: null,
      address: null,
      country: null,
      province: null,
      city: null,
      zipCode: null,
      gender: null,
      status: "DELETED",
      updatedBy: actor,
    },
  });
  return result.count > 0;
}

/**
 * Handles Clerk's `user.updated` webhook. A no-op (not a throw) when the
 * Clerk user has no UserProfile row yet — e.g. they haven't completed
 * onboarding — since there's nothing here for Clerk's data to sync into.
 * Only updates the fields Clerk actually sent.
 */
export async function syncUserProfileFromClerk(
  uid: string,
  data: { displayName?: string; email?: string; photoURL?: string },
): Promise<void> {
  const existing = await prisma.userProfile.findUnique({
    where: { id: uid },
  });
  if (!existing) return;

  const updateData: Partial<typeof data> = {};
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;

  await prisma.userProfile.update({
    where: { id: uid },
    data: updateData,
  });
}
