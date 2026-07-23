import { redirect } from "next/navigation";

import { getOrCreateAppUser, isEmailVerified } from "@/lib/dal";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Also verifies the session and redirects to /sign-in when unauthenticated.
  const user = await getOrCreateAppUser();

  if (!user.onboardingComplete) {
    redirect("/onboarding");
  }

  if (!(await isEmailVerified())) {
    redirect("/verify-email");
  }

  return <>{children}</>;
}
