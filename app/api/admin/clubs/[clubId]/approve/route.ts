import { NextResponse, type NextRequest } from "next/server";
import { approveClub } from "@/core/clubs/services/clubs.service";
import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { logAudit } from "@/core/audit/services/audit.service";

type RouteParams = { params: Promise<{ clubId: string }> };

// Admin approval queue action (see app/dashboard/admin-approvals). Returns
// 404 when the clubId doesn't match any club, and 409 when the club exists
// but is no longer PENDING (e.g. another admin already approved/rejected
// it) — a state conflict, not a silent no-op, consistent with how this
// codebase's other admin mutation routes report an invalid state transition
// (see PATCH /api/admin/clubs/[clubId]'s own 409 on a rejected plan change).
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const { clubId } = await params;
  const result = await approveClub(clubId);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }
  if (result.status === "not_pending") {
    return NextResponse.json(
      { error: "Club is not pending approval" },
      { status: 409 },
    );
  }

  logAudit({
    clubId,
    userId: authResult.context.userId,
    userDisplayName: authResult.context.displayName,
    action: "club.approved",
    entity: "Club",
    entityId: clubId,
  });

  return NextResponse.json({ ok: true });
}
