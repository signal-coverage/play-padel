import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/infrastructure/db/client";

// Thin "who am I" lookup: the current Clerk user's own UserProfile.role,
// clubId, padelCategory, preferredSide, dominantHand, createdAt. Queries Prisma
// directly (same pattern as app/onboarding/layout.tsx) instead of going
// through core/users, which is being migrated to the new owner|player
// SystemRole enum concurrently — this route only reads/writes a few scalar
// fields, so it isn't worth coupling to that in-flux module.
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ profile: null }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: {
      role: true,
      clubId: true,
      padelCategory: true,
      preferredSide: true,
      dominantHand: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ profile });
}

const updatePlayerStyleSchema = z.object({
  preferredSide: z.enum(["forehand", "backhand"]).optional(),
  dominantHand: z.enum(["right", "left"]).optional(),
});

// Player-only self-service edit of their own play-style fields. Anyone
// signed in may call this on their own profile — there is no owner/admin
// path to edit someone else's profile through this route.
export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePlayerStyleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const profile = await prisma.userProfile.update({
    where: { id: userId },
    data: { ...parsed.data, updatedBy: userId },
    select: { preferredSide: true, dominantHand: true },
  });

  return NextResponse.json({ profile });
}
