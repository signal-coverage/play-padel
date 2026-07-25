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
