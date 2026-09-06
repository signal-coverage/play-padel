import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Real Clerk-based admin check, replacing the old static-secret bearer guard
// every app/api/admin/** route (and app/admin/layout.tsx) used to carry
// instead. This app has no Clerk Organizations / B2B concept, so admin-ness
// is a single boolean flag on the Clerk user's own `publicMetadata.isAdmin`
// (set out-of-band via the Clerk Dashboard/CLI, never through this app's own
// UI) rather than an org role. Strict `=== true` check — anything else
// (missing, falsy, or a truthy-but-non-boolean value) is not an admin.
export async function isAdminUser(userId: string): Promise<boolean> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return user.publicMetadata?.isAdmin === true;
}

// Shared Clerk-based admin gate, consolidating the byte-identical local
// `requireAdmin()` copy that used to be duplicated in
// app/api/admin/club-status/route.ts, app/api/admin/membership-free-plan/
// route.ts, app/api/admin/membership-trial-config/route.ts, and
// app/api/admin/mercadopago-backfill-identity/route.ts. Deliberately NOT
// requireAdminProfile() (lib/auth/adminProfile.ts) — see that function's own
// comment for why the two admin concepts stay separate.
export async function requireAdmin(): Promise<NextResponse | null> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdminUser(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
