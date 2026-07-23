"use server";

import { redirect } from "next/navigation";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export type OnboardingFormState = {
  error?: string;
};

// Light sanity check only (digits, spaces, +, -, parentheses, length 6-20) —
// spec sets no format requirement, so strict E.164 validation is scope creep.
const PHONE_PATTERN = /^[0-9+\-()\s]{6,20}$/;

export async function completeOnboarding(
  _prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  const { userId } = await verifySession();

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !city || !phone) {
    return { error: "Name, city, and phone are all required." };
  }

  if (!PHONE_PATTERN.test(phone)) {
    return {
      error: "Enter a valid phone number (digits, spaces, +, -, or () only).",
    };
  }

  await prisma.user.upsert({
    where: { clerkUserId: userId },
    create: { clerkUserId: userId, name, city, phone, onboardingComplete: true },
    update: { name, city, phone, onboardingComplete: true },
  });

  redirect("/");
}
