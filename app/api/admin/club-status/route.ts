import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { updateClubStatusSchema } from "@/core/clubs/schemas/clubStatus.schema";
import { requireAdmin } from "@/lib/auth/admin";
import { setClubStatus } from "@/core/clubs/services/clubs.service";

const clubSelect = {
  id: true,
  name: true,
  status: true,
  updatedBy: true,
  updatedAt: true,
} as const;

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const clubId = new URL(request.url).searchParams.get("clubId");
  if (!clubId) {
    return NextResponse.json({ error: "clubId is required" }, { status: 400 });
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: clubSelect,
  });

  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  return NextResponse.json({ club });
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  // requireAdmin() already confirmed this resolves to a signed-in admin —
  // re-read here only to get the userId itself for the audit trail below.
  const { userId } = await auth();
  const updatedBy = userId!;

  const body = await request.json().catch(() => null);
  const parsed = updateClubStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { clubId, status } = parsed.data;

  // setClubStatus (core/clubs/services/clubs.service.ts) owns the actual
  // transition + the conditional owner notification when it crosses the
  // SUSPENDED boundary either way — shared with scripts/actions/
  // set-club-status.ts, the npm run manage equivalent of this same action.
  const club = await setClubStatus(clubId, status, updatedBy);
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  return NextResponse.json({ club });
}
