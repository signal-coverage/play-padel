import { prisma } from "@/infrastructure/db/client";
import type { UserProfile } from "@/core/users/types";

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const row = await prisma.userProfile.findUnique({
    where: { id: uid },
    include: { customRole: { select: { permissions: true, name: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    roleId: row.roleId as UserProfile["roleId"],
    customRoleId: row.customRoleId ?? undefined,
    customRoleName: row.customRole?.name ?? undefined,
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
    effectivePermissions: row.customRole?.permissions ?? undefined,
  };
}

export async function createUserProfile(
  uid: string,
  data: Omit<
    UserProfile,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "customRoleId"
    | "customRoleName"
    | "effectivePermissions"
  >,
): Promise<UserProfile> {
  const row = await prisma.userProfile.create({
    data: { id: uid, ...data },
  });
  return {
    id: row.id,
    organizationId: row.organizationId,
    roleId: row.roleId as UserProfile["roleId"],
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

export async function updateUserProfile(
  uid: string,
  data: Partial<
    Omit<UserProfile, "id" | "organizationId" | "createdAt" | "createdBy">
  >,
  updatedBy: string,
): Promise<void> {
  await prisma.userProfile.update({
    where: { id: uid },
    data: { ...data, updatedBy },
  });
}

export async function listUsersByOrg(orgId: string): Promise<UserProfile[]> {
  const rows = await prisma.userProfile.findMany({
    where: { organizationId: orgId },
    include: { customRole: { select: { id: true, name: true } } },
    orderBy: { displayName: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organizationId,
    roleId: row.roleId as UserProfile["roleId"],
    customRoleId: row.customRoleId ?? undefined,
    customRoleName: row.customRole?.name ?? undefined,
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
  }));
}
