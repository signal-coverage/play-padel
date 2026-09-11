import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/infrastructure/db/client";
import { createClub } from "@/core/clubs/services/clubs.service";
import { createPendingMembershipSubscription } from "@/core/billing/services/membership.service";
import { logAudit } from "@/core/audit/services/audit.service";
import { notifyAllAdmins } from "@/lib/notifications/dispatcher";
import type { Plan } from "@/core/clubs/types";
import { onboardingFormSchema } from "@/app/onboarding/types";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { checkBot } from "@/lib/security/botGuard";
import { enforceRateLimit } from "@/lib/security/rateLimit";

// Same address app/error.tsx and app/global-error.tsx already show as the
// site-wide support contact — kept as a local const per this repo's
// SRP-per-folder convention rather than a shared cross-folder import.
const SUPPORT_EMAIL = "hello@playpadel.com";

// Completes onboarding for the current Clerk user: player -> UserProfile only
// (no club), owner -> Club + UserProfile pointing at it. Upserts on the
// Clerk-provided userId so a retry (e.g. a failed request the user resubmits)
// is idempotent instead of erroring or creating duplicate rows.
export async function POST(request: Request) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const botCheck = await checkBot();
  if (botCheck) return botCheck;
  const rateLimitCheck = await enforceRateLimit(request, "onboarding", userId);
  if (rateLimitCheck) return rateLimitCheck;

  const clerkUser = await currentUser();
  const accountEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    null;
  if (!accountEmail) {
    return NextResponse.json(
      { error: "Your account has no verified email address" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const parsed = onboardingFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    if (data.userType === "player") {
      // Validated by onboardingFormSchema's superRefine when userType === "player".
      const firstName = data.firstName!;
      const lastName = data.lastName!;
      const phone = data.phone!;
      // There's no separate "display name" question for players anymore —
      // it's derived from the name they gave us.
      const displayName = `${firstName} ${lastName}`.trim();
      const padelCategory =
        data.padelCategory && data.padelCategory !== "unknown"
          ? Number(data.padelCategory)
          : null;

      const existingProfile = await prisma.userProfile.findUnique({
        where: { id: userId },
        select: {
          id: true,
          preferredSide: true,
          dominantHand: true,
          photoURL: true,
          country: true,
          province: true,
          city: true,
          zipCode: true,
        },
      });

      await prisma.userProfile.upsert({
        where: { id: userId },
        create: {
          id: userId,
          role: "player",
          displayName,
          firstName,
          lastName,
          phone,
          address: data.address || null,
          country: data.country || null,
          province: data.province || null,
          city: data.city || null,
          zipCode: data.zipCode || null,
          gender: data.gender ?? null,
          padelCategory,
          preferredSide: data.preferredSide ?? null,
          dominantHand: data.dominantHand ?? null,
          photoURL: clerkUser?.imageUrl ?? null,
          email: accountEmail,
          acceptedTermsAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
        update: {
          role: "player",
          displayName,
          firstName,
          lastName,
          phone,
          address: data.address || null,
          // Same resubmit-clobber risk as preferredSide/dominantHand/photoURL
          // below: these are optional form fields, so falling back to null
          // instead of the existing value would wipe out a location the user
          // already set on an earlier submit.
          country: data.country || existingProfile?.country || null,
          province: data.province || existingProfile?.province || null,
          city: data.city || existingProfile?.city || null,
          zipCode: data.zipCode || existingProfile?.zipCode || null,
          gender: data.gender ?? null,
          padelCategory,
          // Onboarding can be resubmitted (this upsert exists to make retries
          // idempotent), and these three fields are optional in the form —
          // falling back to null instead of the existing value would wipe out
          // anything the player already set via the dashboard's play-style
          // editor between their first submit and a later resubmit.
          preferredSide:
            data.preferredSide ?? existingProfile?.preferredSide ?? null,
          dominantHand:
            data.dominantHand ?? existingProfile?.dominantHand ?? null,
          photoURL: clerkUser?.imageUrl ?? existingProfile?.photoURL ?? null,
          acceptedTermsAt: new Date(),
          updatedBy: userId,
        },
      });

      if (!existingProfile) {
        logAudit({
          clubId: null,
          userId,
          userDisplayName: displayName,
          action: "user.created",
          entity: "UserProfile",
          entityId: userId,
          metadata: { role: "player" },
        });
      }

      return NextResponse.json({ role: "player", clubId: null });
    }

    // Plan/membership tier selection now happens later, in the dashboard's
    // payment-activation gate — every new club starts on BASIC (matches
    // Club.plan's own @default(BASIC) in prisma/schema.prisma).
    const plan: Plan = "BASIC";

    let club;
    try {
      club = await createClub(
        {
          name: data.name!,
          email: data.email!,
          timezone: data.timezone!,
          currency: data.currency!,
          legalName: data.legalName,
          taxId: data.taxId,
          phone: data.phone,
          address: data.address,
          country: data.country,
          province: data.province,
          city: data.city,
          zipCode: data.zipCode,
          plan,
          // The ONLY call site in the codebase that explicitly sets this — a
          // brand-new club must not be able to operate (accept real
          // reservations) until an admin approves it. Every other caller
          // (including createClub's own default) leaves this to the
          // schema's @default(APPROVED), so no existing club is ever
          // affected — see prisma/schema.prisma's Club.approvalStatus and
          // lib/mercadopago/operationalStatus.ts's PENDING_APPROVAL cause.
          approvalStatus: "PENDING",
        },
        userId,
      );
    } catch (error) {
      // Club.email is @unique — onboarding is the ONLY way a Club row is
      // ever created, always right after Terms acceptance, so this should
      // never happen in the normal flow; when it does (e.g. a stale/
      // orphaned club still holding this email, see
      // app/api/webhooks/clerk/route.ts's deactivation-on-owner-deletion),
      // there's no self-serve fix to offer — the email is the real business
      // contact the owner needs, not a throwaway value to swap out — so this
      // routes them to a human instead of a generic validation error.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          {
            error: `This club's email is already registered. Please contact ${SUPPORT_EMAIL} to resolve this.`,
          },
          { status: 409 },
        );
      }
      throw error;
    }

    // Broadcast to every admin so the approval queue gets attention —
    // non-throwing, must never fail onboarding itself.
    try {
      await notifyAllAdmins({
        type: "CLUB_PENDING_APPROVAL",
        clubId: club.id,
        subject: "A new club is pending approval",
        html: `A new club, ${club.name}, is pending approval.`,
        sendEmail: false,
      });
    } catch {
      // notification failure must not affect onboarding
    }

    // `Club.plan` above is still written directly (needed immediately for
    // court-capacity purposes, see design's Onboarding flow) — this seeds
    // the parallel `ClubMembershipSubscription` state-machine row in
    // PENDING, with no MP object created yet. Phase 7's dashboard payment
    // flow is what actually moves this into TRIALING/ACTIVE.
    await createPendingMembershipSubscription({
      clubId: club.id,
      plan,
      currency: data.currency!,
    });

    // Operating hours are no longer configured during onboarding — the owner
    // sets them later in the dashboard's Settings page, once the club is
    // actually operational. Leaving zero ClubOperatingHours rows is fine:
    // resolveDefaultCourtAvailability (core/clubs/services/operatingHours.service.ts)
    // falls back to a full-week 00:00-23:59 default for a club with none.
    await prisma.userProfile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        role: "owner",
        clubId: club.id,
        displayName: data.displayName!,
        email: accountEmail,
        acceptedTermsAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      },
      update: {
        role: "owner",
        clubId: club.id,
        displayName: data.displayName!,
        acceptedTermsAt: new Date(),
        updatedBy: userId,
      },
    });

    logAudit({
      clubId: club.id,
      userId,
      userDisplayName: data.displayName!,
      action: "club.created",
      entity: "Club",
      entityId: club.id,
      metadata: { name: club.name, plan },
    });

    return NextResponse.json({ role: "owner", clubId: club.id });
  } catch (error) {
    // UserProfile.email is @unique (migration
    // 20260906110000_add_user_profile_email_unique) — a different Clerk
    // account onboarding with an email already tied to another UserProfile
    // row hits this, not the generic 500 below.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A user with this email is already registered." },
        { status: 409 },
      );
    }

    console.error("POST /api/onboarding failed:", error);
    return NextResponse.json(
      {
        error: "Something went wrong completing onboarding. Please try again.",
      },
      { status: 500 },
    );
  }
}
