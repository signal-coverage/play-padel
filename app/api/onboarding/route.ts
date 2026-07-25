import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { createClub } from "@/core/clubs/services/clubs.service";
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
          gender: data.gender ?? null,
          padelCategory,
          email: accountEmail,
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
          gender: data.gender ?? null,
          padelCategory,
          updatedBy: userId,
        },
      });
      return NextResponse.json({ role: "player", clubId: null });
    }

    // Validated by onboardingFormSchema's superRefine when userType === "owner".
    const plan =
      COURT_RANGE_OPTIONS.find((option) => option.value === data.courtRange)
        ?.plan ?? "FREE";

    const club = await createClub(
      {
        name: data.name!,
        email: data.email!,
        timezone: data.timezone!,
        currency: data.currency!,
        legalName: data.legalName,
        taxId: data.taxId,
        phone: data.phone,
        plan,
      },
      userId,
    );

    await prisma.userProfile.upsert({
      where: { id: userId },
      create: {
        id: userId,
        role: "owner",
        clubId: club.id,
        displayName: data.displayName!,
        email: accountEmail,
        createdBy: userId,
        updatedBy: userId,
      },
      update: {
        role: "owner",
        clubId: club.id,
        displayName: data.displayName!,
        updatedBy: userId,
      },
    });

    return NextResponse.json({ role: "owner", clubId: club.id });
  } catch (error) {
    console.error("POST /api/onboarding failed:", error);
    return NextResponse.json(
      { error: "Something went wrong completing onboarding. Please try again." },
      { status: 500 },
    );
  }
}
