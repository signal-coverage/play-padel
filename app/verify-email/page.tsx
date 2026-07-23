import { redirect } from "next/navigation";

import { isEmailVerified, verifySession } from "@/lib/dal";

import { ResendButton } from "./resend-button";

export default async function VerifyEmailPage() {
  // Redirects to /sign-in if there's no authenticated session — self-enforced
  // auth, matching /onboarding's existing treatment.
  await verifySession();

  if (await isEmailVerified()) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="max-w-sm">
        <h1 className="text-2xl font-semibold">Verify your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a verification link to your email address. Click it, then
          come back here.
        </p>
      </div>
      <ResendButton />
      <a
        href="/verify-email"
        className="text-sm underline underline-offset-4"
      >
        I&apos;ve verified — check again
      </a>
    </div>
  );
}
