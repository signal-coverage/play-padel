import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { joinWaitlist } from "@/core/waitlist/services/waitlist.service";

// Never trust client-supplied courtName/clubId — look the court up
// server-side, same principle as every other write endpoint in this
// codebase.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const courtId = body?.courtId;
  const scheduledStartRaw = body?.scheduledStart;
  const scheduledEndRaw = body?.scheduledEnd;

  if (
    typeof courtId !== "string" ||
    typeof scheduledStartRaw !== "string" ||
    typeof scheduledEndRaw !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid courtId/scheduledStart/scheduledEnd" },
      { status: 400 },
    );
  }

  const scheduledStart = new Date(scheduledStartRaw);
  const scheduledEnd = new Date(scheduledEndRaw);
  if (
    Number.isNaN(scheduledStart.getTime()) ||
    Number.isNaN(scheduledEnd.getTime())
  ) {
    return NextResponse.json(
      { error: "scheduledStart/scheduledEnd must be valid ISO dates" },
      { status: 400 },
    );
  }

  const court = await prisma.court.findUnique({
    where: { id: courtId },
    select: { id: true, name: true, clubId: true },
  });
  if (!court) {
    return NextResponse.json({ error: "Court not found" }, { status: 404 });
  }

  try {
    const entry = await joinWaitlist({
      courtId: court.id,
      courtName: court.name,
      clubId: court.clubId,
      scheduledStart,
      scheduledEnd,
      userId,
    });
    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json(
      { error: "Could not join the waitlist for this slot" },
      { status: 500 },
    );
  }
}
