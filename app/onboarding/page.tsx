import { redirect } from "next/navigation";

import { getOrCreateAppUser } from "@/lib/dal";

import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await getOrCreateAppUser();

  if (user.onboardingComplete) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="mb-8 max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Tell us about yourself</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We need a few details before you can start booking courts.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
