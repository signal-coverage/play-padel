"use client";

import { useEffect } from "react";
import { SignIn, useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { clerkAppearance } from "@/app/(auth)/_components/clerk-appearance";

export function LoginView() {
  const { isLoaded, isSignedIn } = useAuth();

  // Doesn't wait on `fallbackRedirectUrl`'s own client-side router
  // transition — that transition, reached right after auth completes, was
  // reproduced live leaving the target page stuck mid-render in Next.js
  // dev mode (a blank page, Next's own dev overlay stuck on "Rendering").
  // The instant a real session shows up, force a HARD navigation instead
  // (`window.location.replace`, not Next's router) — the same kind of
  // navigation an F5 does, which reliably escapes every stuck state
  // reproduced so far. `fallbackRedirectUrl` stays below as a harmless
  // safety net for whichever of the two navigations wins the race.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      window.location.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn]);

  return (
    <motion.div
      className="w-full"
      style={{ maxWidth: "360px" }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Welcome back!
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Sign in to your account to continue.
        </p>
      </div>

      {/* "/dashboard" — same target as SignupView now, letting
          DashboardGuard's own client-side "does this account still need
          onboarding?" check (app/dashboard/_components/DashboardGuard)
          be the ONE place that decides, for both flows identically,
          instead of each auth entry point picking its own destination.
          Deliberately NOT "/" here despite that page ALSO knowing how to
          route a signed-in visitor (see app/page.tsx): a Server
          Component's synchronous `redirect()`, reached via the CLIENT-SIDE
          navigation Clerk performs right after auth completes, left the
          page stuck mid-render in Next.js dev mode — reproduced live, on
          both login and signup, once "/" became the shared target.
          DashboardGuard's redirect is a plain `router.replace()` inside a
          `useEffect`, firing only after /dashboard has already mounted —
          not the same risky pattern. */}
      <SignIn
        routing="hash"
        signUpUrl="/signup"
        fallbackRedirectUrl="/dashboard"
        appearance={clerkAppearance}
      />
    </motion.div>
  );
}
