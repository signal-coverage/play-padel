import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { requireAdminProfile } from "@/lib/auth/adminProfile";
import {
  updateUserProfile,
  anonymizeUserProfile,
} from "@/core/users/services/users.service";
import { logAudit } from "@/core/audit/services/audit.service";
import { adminUpdatePlayerSchema } from "@/core/users/schemas/adminPlayerUpdate.schema";
import { dispatch } from "@/lib/notifications/dispatcher";

type RouteParams = { params: Promise<{ userId: string }> };

type PlayerRow = NonNullable<
  Awaited<ReturnType<typeof prisma.userProfile.findUnique>>
>;

// Excludes an owner's row from every lookup here — this route only ever
// acts on players, so a caller passing an owner's userId gets the same 404
// a genuinely-missing row would, rather than a 403/leak of which owner
// userIds exist.
async function findEditablePlayer(userId: string): Promise<PlayerRow | null> {
  const row = await prisma.userProfile.findUnique({ where: { id: userId } });
  if (!row || row.role !== "player") return null;
  return row;
}

function toPlayerResponse(row: PlayerRow) {
  return {
    id: row.id,
    displayName: row.displayName,
    avatarUrl: row.photoURL,
    padelCategory: row.padelCategory,
    preferredSide: row.preferredSide,
    dominantHand: row.dominantHand,
    email: row.email,
    phone: row.phone,
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const adminResult = await requireAdminProfile();
  if (!adminResult.ok) return adminResult.response;

  const { userId: targetUserId } = await params;
  const target = await findEditablePlayer(targetUserId);
  if (!target) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adminUpdatePlayerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  await updateUserProfile(
    targetUserId,
    parsed.data,
    adminResult.context.userId,
  );

  logAudit({
    clubId: null,
    userId: adminResult.context.userId,
    userDisplayName: adminResult.context.displayName,
    action: "user.updated",
    entity: "UserProfile",
    entityId: targetUserId,
    metadata: parsed.data,
  });

  // Notification failure must not affect the profile update response —
  // the player affected has zero other live signal that an admin changed
  // their data otherwise.
  try {
    await dispatch({
      type: "PROFILE_UPDATED_BY_ADMIN",
      clubId: null,
      recipientId: targetUserId,
      recipientEmail: target.email,
      recipientName: target.displayName,
      subject: "Your profile was updated",
      html: "An administrator updated your profile.",
      sendEmail: false,
    });
  } catch {
    // notification failure must not affect the profile update
  }

  return NextResponse.json({
    player: toPlayerResponse({ ...target, ...parsed.data }),
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const adminResult = await requireAdminProfile();
  if (!adminResult.ok) return adminResult.response;

  const { userId: targetUserId } = await params;

  if (targetUserId === adminResult.context.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    );
  }

  const target = await findEditablePlayer(targetUserId);
  if (!target) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  await anonymizeUserProfile(targetUserId, adminResult.context.userId);

  logAudit({
    clubId: null,
    userId: adminResult.context.userId,
    userDisplayName: adminResult.context.displayName,
    action: "user.anonymized",
    entity: "UserProfile",
    entityId: targetUserId,
    metadata: { targetDisplayName: target.displayName },
  });

  // Uses `target.email`/`target.displayName` — the PRE-anonymization values
  // captured above, before anonymizeUserProfile overwrote the row's own
  // email to its deleted-*@play-padel.invalid placeholder. Emailed (not
  // just in-app) since the account is gone — an in-app notification the
  // player can never sign back in to read would be pointless.
  try {
    await dispatch({
      type: "PROFILE_UPDATED_BY_ADMIN",
      clubId: null,
      recipientId: targetUserId,
      recipientEmail: target.email,
      recipientName: target.displayName,
      subject: "Your account was deleted",
      html: "An administrator deleted your account. If you believe this is a mistake, contact support.",
      sendEmail: true,
    });
  } catch {
    // notification failure must not affect the account deletion
  }

  return NextResponse.json({ ok: true });
}
