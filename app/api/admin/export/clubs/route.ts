import { NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/infrastructure/db/client";
import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { toCsv } from "@/lib/csv/toCsv";

const HEADERS = [
  "id",
  "name",
  "legalName",
  "email",
  "phone",
  "status",
  "plan",
  "createdAt",
];

// Admin-only CSV export of every Club on the platform — same
// requireAdminProfile gate and unscoped-across-clubs shape as
// GET /api/admin/clubs, just serialized as a downloadable CSV instead of
// JSON for the admin's own record-keeping/reporting needs.
export async function GET() {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const clubs = await prisma.club.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      legalName: true,
      email: true,
      phone: true,
      status: true,
      plan: true,
      createdAt: true,
    },
  });

  const csv = toCsv({
    headers: HEADERS,
    rows: clubs.map((club) => [
      club.id,
      club.name,
      club.legalName,
      club.email,
      club.phone,
      club.status,
      club.plan,
      club.createdAt.toISOString(),
    ]),
  });

  const filename = `clubs-export-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
