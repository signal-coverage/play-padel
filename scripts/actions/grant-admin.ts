/**
 * Sets UserProfile.isAdmin = true for one user by email — the real gate
 * behind requireAdminProfile() (lib/auth/adminProfile.ts) that unlocks the
 * in-app admin dashboard. Also sets the separate, legacy Clerk
 * publicMetadata.isAdmin flag (lib/auth/admin.ts) on the same user, so a
 * single grant keeps both admin mechanisms in sync instead of relying on an
 * operator to remember to update both by hand (see docs/ADMIN_BOOTSTRAP.md).
 *
 * The target user must have signed in / completed onboarding at least once
 * so their UserProfile row exists. DATABASE_URL is expected to already be
 * set (scripts/menu.ts loads it from the chosen .env file before calling
 * this) — this module never picks an environment on its own. CLERK_SECRET_KEY
 * must be set from the same .env file for the Clerk sync step below.
 */
import { clerkClient } from "@clerk/nextjs/server";
import { log, withSpinner } from "../lib/prompt";
import { dispatch } from "../../lib/notifications/dispatcher";

export async function grantAdmin(email: string): Promise<void> {
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
      log.message(
        "They need to sign in / complete onboarding at least once first.",
      );
      return;
    }

    if (profile.isAdmin) {
      log.warn(`${profile.displayName} (${email}) is already an admin.`);
      return;
    }

    await withSpinner(`Granting admin to ${profile.displayName}…`, () =>
      prisma.userProfile.update({
        where: { id: profile.id },
        data: { isAdmin: true },
      }),
    );

    // Keeps the two admin mechanisms in sync going forward — failure here
    // must not affect the DB grant that already happened above, same
    // "the real gate already succeeded" convention as the notification
    // dispatch below.
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(profile.id, {
        publicMetadata: { isAdmin: true },
      });
    } catch (err) {
      log.warn(
        `Clerk publicMetadata sync failed (DB grant still succeeded): ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }

    // Failure here must not affect the grant that already happened above —
    // same "notification failure must not affect the actual action"
    // convention as core/clubs/services/clubs.service.ts's own dispatch()
    // callers (approveClub/rejectClub/etc.).
    try {
      await dispatch({
        type: "ADMIN_ACCESS_GRANTED",
        clubId: null,
        recipientId: profile.id,
        recipientEmail: email,
        recipientName: profile.displayName,
        subject: "You now have admin access on Play Padel",
        html: "Your account now has admin access — you can view platform-wide metrics, approve clubs, and more from the Admin menu.",
        sendEmail: true,
      });
    } catch (err) {
      log.warn(
        `Notification failed to send (grant itself still succeeded): ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }

    log.success(`${profile.displayName} (${email}) is now an admin.`);
  } finally {
    await prisma.$disconnect();
  }
}
