import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";

export type OwnerContext = {
  userId: string;
  clubId: string;
};

export type RequireOwnerResult =
  { ok: true; context: OwnerContext } | { ok: false; response: NextResponse };

/**
 * Resolves the current Clerk user's own club ownership, ignoring any
 * client-supplied clubId — mirrors app/api/me/route.ts's direct Prisma
 * lookup, but also enforces role === "owner" since every route under
 * app/api/clubs/** only ever acts on the caller's own club.
 */
export async function requireOwnerClub(): Promise<RequireOwnerResult> {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult;
  const { userId } = authResult;

  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { role: true, clubId: true },
  });

  if (!profile || profile.role !== "owner" || !profile.clubId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, context: { userId, clubId: profile.clubId } };
}
