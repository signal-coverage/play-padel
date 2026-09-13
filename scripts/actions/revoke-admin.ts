/**
 * Sets UserProfile.isAdmin = false for one user by email — undoes
 * grant-admin.ts's own action, revoking the same gate
 * requireAdminProfile() (lib/auth/adminProfile.ts) checks. Also clears the
 * separate, legacy Clerk publicMetadata.isAdmin flag (lib/auth/admin.ts) on
 * the same user, mirroring grant-admin.ts's own sync so a revoke can't
 * accidentally leave the legacy mechanism still granting access (see
 * docs/ADMIN_BOOTSTRAP.md).
 *
 * DATABASE_URL is expected to already be set (scripts/menu.ts loads it from
 * the chosen .env file before calling this) — this module never picks an
 * environment on its own. CLERK_SECRET_KEY must be set from the same .env
 * file for the Clerk sync step below.
 */
import { clerkClient } from "@clerk/nextjs/server";
import { log, withSpinner } from "../lib/prompt";
import { dispatch } from "../../lib/notifications/dispatcher";

export async function revokeAdmin(email: string): Promise<void> {
  const { prisma } = await import("../../infrastructure/db/client");

  try {
    const profile = await withSpinner("Looking up UserProfile…", () =>
      prisma.userProfile.findUnique({
        where: { email },
        select: { id: true, displayName: true, isAdmin: true },
      }),
    );

    if (!profile) {
      log.error(`No UserProfile found for ${email}.`);
      return;
    }

    if (!profile.isAdmin) {
      log.warn(`${profile.displayName} (${email}) is not an admin.`);
      return;
    }

    await withSpinner(`Revoking admin from ${profile.displayName}…`, () =>
      prisma.userProfile.update({
        where: { id: profile.id },
        data: { isAdmin: false },
      }),
    );

    // Keeps the two admin mechanisms in sync going forward — failure here
    // must not affect the DB revoke that already happened above, same
    // "the real gate already succeeded" convention as the notification
    // dispatch below.
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(profile.id, {
        publicMetadata: { isAdmin: false },
      });
    } catch (err) {
      log.warn(
        `Clerk publicMetadata sync failed (DB revoke still succeeded): ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }

    // Failure here must not affect the revoke that already happened above —
    // same "notification failure must not affect the actual action"
    // convention as grantAdmin's own dispatch() call.
    try {
      await dispatch({
        type: "ADMIN_ACCESS_REVOKED",
        clubId: null,
        recipientId: profile.id,
        recipientEmail: email,
        recipientName: profile.displayName,
        subject: "Your admin access on Play Padel was revoked",
        html: "Your account no longer has admin access — you've lost access to platform-wide metrics, club approvals, and the rest of the Admin menu.",
        sendEmail: true,
      });
    } catch (err) {
      log.warn(
        `Notification failed to send (revoke itself still succeeded): ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }

    log.success(`${profile.displayName} (${email}) is no longer an admin.`);
  } finally {
    await prisma.$disconnect();
  }
}
