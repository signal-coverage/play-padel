import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { createClub } from "@/core/clubs/services/clubs.service";
import { createPendingMembershipSubscription } from "@/core/billing/services/membership.service";
import { logAudit } from "@/core/audit/services/audit.service";
import {
  onboardingFormSchema,
  COURT_RANGE_OPTIONS,
} from "@/app/onboarding/types";

// Completes onboarding for the current Clerk user: player -> UserProfile only
// (no club), owner -> Club + UserProfile pointing at it. Upserts on the
// Clerk-provided userId so a retry (e.g. a failed request the user resubmits)
// is idempotent instead of erroring or creating duplicate rows.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Validated by onboardingFormSchema's superRefine when userType === "owner".
    const plan =
      COURT_RANGE_OPTIONS.find((option) => option.value === data.courtRange)
        ?.plan ?? "BASIC";

    const club = await createClub(
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
      },
      userId,
    );

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
    console.error("POST /api/onboarding failed:", error);
    return NextResponse.json(
      {
        error: "Something went wrong completing onboarding. Please try again.",
      },
      { status: 500 },
    );
  }
}
