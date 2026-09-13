/**
 * Audits drift between the two admin mechanisms this app has ever had (see
 * docs/ADMIN_BOOTSTRAP.md): `UserProfile.isAdmin` (DB, the real gate behind
 * the in-app dashboard) and Clerk `publicMetadata.isAdmin` (legacy, gates
 * only the old /admin/club-status testing page). grant-admin.ts/
 * revoke-admin.ts keep the two in sync going forward, but anyone granted
 * admin before that sync existed — or via the Clerk Dashboard/CLI directly —
 * can still be out of sync. Read-only: reports mismatches, changes nothing.
 *
 * DATABASE_URL is expected to already be set (scripts/menu.ts loads it from
 * the chosen .env file before calling this) — this module never picks an
 * environment on its own. CLERK_SECRET_KEY must be set from the same .env
 * file.
 */
import { clerkClient } from "@clerk/nextjs/server";
import { log, note, withSpinner } from "../lib/prompt";

export type AdminFlagMismatch = {
  userId: string;
  email: string;
  displayName: string;
  // true = has this flag, false = doesn't — always exactly one of dbOnly/
  // clerkOnly per row, never both (a row with both flags set isn't a
  // mismatch, it's simply not reported).
  dbOnly: boolean;
};

// Clerk's own page-size ceiling for this endpoint.
const CLERK_PAGE_SIZE = 500;

async function listClerkAdminIds(): Promise<Set<string>> {
  const client = await clerkClient();
  const adminIds = new Set<string>();
  let offset = 0;

  while (true) {
    const { data, totalCount } = await client.users.getUserList({
      limit: CLERK_PAGE_SIZE,
      offset,
    });
    for (const user of data) {
      if (user.publicMetadata?.["isAdmin"] === true) adminIds.add(user.id);
    }
    offset += data.length;
    if (data.length === 0 || offset >= totalCount) break;
  }

  return adminIds;
}

export async function reconcileAdminFlags(): Promise<void> {
  const { prisma } = await import("../../infrastructure/db/client");

  try {
    const [dbAdmins, clerkAdminIds] = await withSpinner(
      "Comparing DB admins against Clerk publicMetadata…",
      async () => {
        const admins = await prisma.userProfile.findMany({
          where: { isAdmin: true },
          select: { id: true, email: true, displayName: true },
        });
        return [admins, await listClerkAdminIds()] as const;
      },
    );

    const dbAdminIds = new Set(dbAdmins.map((a) => a.id));
    const mismatches: AdminFlagMismatch[] = [];

    for (const admin of dbAdmins) {
      if (!clerkAdminIds.has(admin.id)) {
        mismatches.push({
          userId: admin.id,
          email: admin.email,
          displayName: admin.displayName,
          dbOnly: true,
        });
      }
    }

    for (const clerkId of clerkAdminIds) {
      if (dbAdminIds.has(clerkId)) continue;
      const profile = await prisma.userProfile.findUnique({
        where: { id: clerkId },
        select: { email: true, displayName: true },
      });
      mismatches.push({
        userId: clerkId,
        email: profile?.email ?? "(no UserProfile row)",
        displayName: profile?.displayName ?? "(unknown)",
        dbOnly: false,
      });
    }

    if (mismatches.length === 0) {
      log.success("No drift found — every admin flag matches on both sides.");
      return;
    }

    const lines = mismatches.map((m) =>
      m.dbOnly
        ? `DB only:    ${m.displayName} (${m.email}) — has UserProfile.isAdmin, missing Clerk publicMetadata.isAdmin`
        : `Clerk only: ${m.displayName} (${m.email}) — has Clerk publicMetadata.isAdmin, missing UserProfile.isAdmin`,
    );
    note(
      lines.join("\n"),
      `${mismatches.length} admin flag mismatch(es) found`,
    );
    log.message(
      "Re-run Grant/Revoke admin access for each — it sets both flags together and closes the gap.",
    );
  } finally {
    await prisma.$disconnect();
  }
}
