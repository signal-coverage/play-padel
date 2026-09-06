import { NextResponse, type NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { logAudit } from "@/core/audit/services/audit.service";
import { impersonateUserSchema } from "@/core/users/schemas/adminImpersonate.schema";

// Admin "impersonation": creates a Clerk actor token so an admin can sign in
// as another UserProfile (player or club owner) for support/debugging,
// using Clerk's real actor-token mechanism (POST /v1/actor_tokens via the
// @clerk/backend SDK's clerkClient().actorTokens.create) — never a
// home-grown session forgery. Gated by lib/auth/adminProfile.ts's
// requireAdminProfile(), the same real `UserProfile.isAdmin` check every
// other new admin route in this codebase uses — deliberately NOT the older
// Clerk-metadata-based lib/auth/admin.ts gate.
//
// This is the single most sensitive action on the admin surface (it
// bypasses the target's own MFA/session), so unlike some other audit calls
// in this codebase that are fire-and-forget best-effort, this route never
// skips calling logAudit on the success path. The raw Clerk `token` value is
// never logged or returned to the client — only the ready-to-use sign-in
// `url` goes to the client, and only the actor token's `id` (not the token
// itself) goes into audit metadata.
export async function POST(request: NextRequest) {
  const adminResult = await requireAdminProfile();
  if (!adminResult.ok) return adminResult.response;

  const body = await request.json().catch(() => null);
  const parsed = impersonateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { userId: targetUserId } = parsed.data;

  if (targetUserId === adminResult.context.userId) {
    return NextResponse.json(
      { error: "You cannot impersonate yourself." },
      { status: 400 },
    );
  }

  const target = await prisma.userProfile.findUnique({
    where: { id: targetUserId },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.isAdmin) {
    return NextResponse.json(
      { error: "You cannot impersonate another admin." },
      { status: 400 },
    );
  }

  const client = await clerkClient();
  const actorToken = await client.actorTokens.create({
    userId: targetUserId,
    actor: { sub: adminResult.context.userId },
    // Keep the documented Clerk defaults (1hr token lifetime / 30min
    // session cap) — short-lived enough for a support session, and no
    // strong reason found to shorten them further.
    expiresInSeconds: 3600,
    sessionMaxDurationInSeconds: 1800,
  });

  logAudit({
    clubId: null,
    userId: adminResult.context.userId,
    userDisplayName: adminResult.context.displayName,
    action: "user.impersonated",
    entity: "UserProfile",
    entityId: targetUserId,
    metadata: {
      actorTokenId: actorToken.id,
      targetDisplayName: target.displayName,
    },
  });

  return NextResponse.json({ url: actorToken.url });
}
