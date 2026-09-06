import { NextResponse, type NextRequest } from "next/server";
import { rejectClub } from "@/core/clubs/services/clubs.service";
import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { logAudit } from "@/core/audit/services/audit.service";

type RouteParams = { params: Promise<{ clubId: string }> };

// Admin approval queue action (see app/dashboard/admin-approvals) — mirrors
// .../approve/route.ts exactly, just the REJECTED transition/audit action
// instead of APPROVED. Same 404/409 reasoning as that route.
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const { clubId } = await params;
  const result = await rejectClub(clubId);

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
    action: "club.rejected",
    entity: "Club",
    entityId: clubId,
  });

  return NextResponse.json({ ok: true });
}
