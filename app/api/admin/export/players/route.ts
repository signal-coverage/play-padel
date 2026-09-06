import { NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/infrastructure/db/client";
import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { toCsv } from "@/lib/csv/toCsv";

const HEADERS = [
  "id",
  "displayName",
  "email",
  "phone",
  "padelCategory",
  "preferredSide",
  "dominantHand",
  "createdAt",
];

// Admin-only CSV export of every player (role: "player") on the platform —
// same field selection as GET /api/players (id, displayName, email, phone,
// padelCategory, preferredSide, dominantHand) plus createdAt, but
// intentionally not scoped to status: "ACTIVE" like that route is, since an
// admin export should cover every player record, not just active ones.
export async function GET() {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const players = await prisma.userProfile.findMany({
    where: { role: "player" },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true,
      padelCategory: true,
      preferredSide: true,
      dominantHand: true,
      createdAt: true,
    },
  });

  const csv = toCsv({
    headers: HEADERS,
    rows: players.map((player) => [
      player.id,
      player.displayName,
      player.email,
      player.phone,
      player.padelCategory,
      player.preferredSide,
      player.dominantHand,
      player.createdAt.toISOString(),
    ]),
  });

  const filename = `players-export-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
