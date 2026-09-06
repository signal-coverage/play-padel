import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";

export type AdminProfileContext = {
  userId: string;
  displayName: string;
};

export type RequireAdminProfileResult =
  | { ok: true; context: AdminProfileContext }
  | { ok: false; response: NextResponse };

/**
 * Real, additive `UserProfile.isAdmin` gate (see prisma/schema.prisma) — the
 * same admin concept app/api/admin/metrics/route.ts and
 * app/api/admin/audit-logs/route.ts each check with their own locally
 * duplicated `NextResponse | null` version (this repo's existing "each admin
 * route keeps its own copy" convention). Deliberately NOT
 * lib/auth/admin.ts's separate Clerk-metadata-based isAdminUser() check,
 * which only gates the older /admin/club-status testing tool.
 *
 * Extracted as a shared helper (unlike the two duplicated copies above)
 * because app/api/admin/players/[userId]/route.ts needs the admin's own
 * displayName too — for logAudit's actor fields — not just a yes/no gate,
 * and this is now a second real consumer of that same extra lookup.
 */
export async function requireAdminProfile(): Promise<RequireAdminProfileResult> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { isAdmin: true, displayName: true },
  });

  if (!profile || profile.isAdmin !== true) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, context: { userId, displayName: profile.displayName } };
}
