import { NextResponse } from "next/server";
import { listAllClubs } from "@/core/clubs/services/clubs.service";
import { requireAdminProfile } from "@/lib/auth/adminProfile";

// Global, unscoped club list backing the admin-only club picker (see
// app/dashboard/settings/club/_components/AdminClubSettingsView) — every
// club on the platform, not just the caller's own (there is no "caller's own
// club" for an admin). Deliberately separate from the owner-only
// GET /api/clubs, which is untouched.
export async function GET() {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const clubs = await listAllClubs();
  return NextResponse.json({ clubs });
}
