import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { getClubById } from "@/core/clubs/services/clubs.service";

export type AdminClubContext = {
  userId: string;
  clubId: string;
};

export type RequireAdminClubResult =
  | { ok: true; context: AdminClubContext }
  | { ok: false; response: NextResponse };

/**
 * Admin-side sibling of requireOwnerClub() (see app/api/clubs/_lib/
 * require-owner.ts) for the admin tournament tree
 * (app/api/admin/clubs/[clubId]/tournaments/**) — resolves `clubId` from the
 * route's own param (after verifying the caller is a real admin via
 * requireAdminProfile()) instead of the caller's own club, and confirms the
 * club actually exists (404 otherwise, same as app/api/admin/clubs/[clubId]/
 * route.ts's own GET/PATCH). Returns the exact same
 * `{ userId, clubId }` context shape requireOwnerClub does, so every admin
 * tournament route's business-logic call stays byte-identical to its
 * owner-only counterpart — only this auth/context resolution line differs.
 */
export async function requireAdminClub(
  clubId: string,
): Promise<RequireAdminClubResult> {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult;

  const club = await getClubById(clubId);
  if (!club) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Club not found" }, { status: 404 }),
    };
  }

  return {
    ok: true,
    context: { userId: authResult.context.userId, clubId },
  };
}
