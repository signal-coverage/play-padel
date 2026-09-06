import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { updateClubStatusSchema } from "@/core/clubs/schemas/clubStatus.schema";
import { requireAdmin } from "@/lib/auth/admin";
import { getClubOwner } from "@/core/clubs/services/clubs.service";
import { dispatch } from "@/lib/notifications/dispatcher";

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

  try {
    const existing = await prisma.club.findUnique({
      where: { id: clubId },
      select: { status: true },
    });
    const previousStatus = existing?.status;

    const club = await prisma.club.update({
      where: { id: clubId },
      data: { status, updatedBy },
      select: clubSelect,
    });

    if (previousStatus !== "SUSPENDED" && status === "SUSPENDED") {
      try {
        const owner = await getClubOwner(clubId);
        if (owner) {
          await dispatch({
            type: "CLUB_SUSPENDED",
            clubId,
            recipientId: owner.id,
            recipientEmail: owner.email,
            recipientName: owner.displayName,
            subject: "Your club has been suspended",
            html: "Your club has been suspended. Contact support for details.",
            sendEmail: false,
          });
        }
      } catch {
        // notification failure must not affect the status update response
      }
    }

    return NextResponse.json({ club });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }
    throw err;
  }
}
