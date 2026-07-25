import "@/lib/plugins/initialize-plugins";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";

export async function requireOrgProfile() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });
  if (!profile) throw new Error("Profile not found");

  let effectivePermissions: string[] | undefined;
  if (profile.customRoleId) {
    const customRole = await prisma.customRole.findUnique({
      where: {
        id: profile.customRoleId,
        organizationId: profile.organizationId,
      },
      select: { permissions: true },
    });
    if (customRole) {
      effectivePermissions = customRole.permissions;
    }
  }

  return { ...profile, effectivePermissions };
}
