import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";

// Thin "who am I" lookup: the current Clerk user's own UserProfile.role and
// clubId. Queries Prisma directly (same pattern as app/onboarding/layout.tsx)
// instead of going through core/users, which is being migrated to the new
// owner|player SystemRole enum concurrently — this route only reads two
// scalar fields, so it isn't worth coupling to that in-flux module.
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ profile: null }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { role: true, clubId: true },
  });

  return NextResponse.json({ profile });
}
