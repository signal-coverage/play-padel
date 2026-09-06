import { NextResponse } from "next/server";
import { listPendingClubs } from "@/core/clubs/services/clubs.service";
import { requireAdminProfile } from "@/lib/auth/adminProfile";

// Admin approval queue (see prisma/schema.prisma's Club.approvalStatus and
// lib/mercadopago/operationalStatus.ts's PENDING_APPROVAL cause) — every
// club currently awaiting review, for app/dashboard/admin-approvals's
// AdminApprovalsView. Gated the same way as every other admin-only route
// (see app/api/admin/clubs/route.ts).
export async function GET() {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const clubs = await listPendingClubs();
  return NextResponse.json({ clubs });
}
