"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { checkPermission } from "@/core/permissions/utils";
import type { SystemRole } from "@/core/users/types";
import type { ActionResult } from "@/core/billing/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import { logAudit } from "@/core/audit/services/audit.service";

export async function inviteUser(
  email: string,
  roleId: SystemRole,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();

    if (
      !checkPermission(
        profile.roleId,
        "users.invite",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    const existing = await prisma.userProfile.findFirst({
      where: {
        email,
        organizationId: profile.organizationId,
      },
    });

    if (existing) {
      return {
        success: false,
        error: "This user is already a member of your organization",
      };
    }

    const client = await clerkClient();
    await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: "/signup",
      publicMetadata: {
        organizationId: profile.organizationId,
        roleId,
      },
    });

    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "user.invited",
      entity: "user",
      entityId: email,
      metadata: { email, roleId },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("inviteUser error:", error);
    return { success: false, error: "Failed to send invitation" };
  }
}
