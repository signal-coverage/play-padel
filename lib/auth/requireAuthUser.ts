import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export type RequireAuthUserResult =
  { ok: true; userId: string } | { ok: false; response: NextResponse };

/**
 * Shared "any signed-in Clerk user" gate — the plain
 * `const { userId } = await auth(); if (!userId) return 401;` boilerplate
 * duplicated across every route with no further admin/ownership check
 * beyond authentication. Mirrors the same ok/response-discriminated-union
 * shape as requireAdminProfile() (lib/auth/adminProfile.ts) and
 * requireOwnerClub() (app/api/clubs/_lib/require-owner.ts), which layer
 * their own additional checks on top of this same first step.
 */
export async function requireAuthUser(): Promise<RequireAuthUserResult> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, userId };
}
