import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { updateClubStatusSchema } from "@/core/clubs/schemas/clubStatus.schema";

// Minimal-scope admin surface: a static-secret bearer guard, not a new
// admin role — same convention as app/api/admin/membership-trial-config.
// `ACTIVE`/`INACTIVE` are otherwise fully owned by the billing state
// machine in core/billing/services/membership.service.ts; this route lets
// an admin override any status, including the manual `SUSPENDED`/
// `DISABLED` lockouts that machine never sets on its own.
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.MEMBERSHIP_ADMIN_SECRET}`;
}

const clubSelect = {
  id: true,
  name: true,
  status: true,
  updatedBy: true,
  updatedAt: true,
} as const;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateClubStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { clubId, status, updatedBy } = parsed.data;

  try {
    const club = await prisma.club.update({
      where: { id: clubId },
      data: { status, updatedBy },
      select: clubSelect,
    });

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
