"use client";

import { useEffect } from "react";
import { SignUp, useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { clerkAppearance } from "@/app/(auth)/_components/clerk-appearance";

export function SignupView() {
  const { isLoaded, isSignedIn } = useAuth();

  // Doesn't wait on `fallbackRedirectUrl`'s own client-side router
  // transition — reproduced live leaving the target page stuck mid-render
  // in Next.js dev mode even for a single, non-looping hop (a blank page,
  // Next's own dev overlay stuck on "Rendering", the URL never settling) —
  // specifically for an already-onboarded owner signing up via Google
  // (Clerk signs an existing account in rather than creating a duplicate).
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
      <div className="mb-4 text-center">
        <h1 className="text-[26px] font-bold text-foreground tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Get started with Play Padel today.
        </p>
      </div>

      {/* "/dashboard" — same target as LoginView, and for the same reason:
          DashboardGuard's own client-side onboarding check is the ONE
          place that decides, for both flows identically, whether a signed-
          in visitor still needs /onboarding. That matters here specifically
          because "signed up" doesn't always mean "brand new" — this path
          can also be hit by someone with an EXISTING, already-onboarded
          account (e.g. Google auto-signs them in instead of creating a
          duplicate) — DashboardGuard gets that case right by checking real
          data instead of assuming. Deliberately NOT "/" despite that page
          ALSO knowing how to route a signed-in visitor (see app/page.tsx):
          its synchronous server `redirect()`, reached via the CLIENT-SIDE
          navigation Clerk performs right after auth completes, left the
          page stuck mid-render in Next.js dev mode — reproduced live, on
          both login and signup, once "/" became the shared target.
          DashboardGuard's own redirect is a plain `router.replace()`
          inside a `useEffect`, firing only after /dashboard has already
          mounted — not the same risky pattern. */}
      <SignUp
        routing="hash"
        signInUrl="/login"
        fallbackRedirectUrl="/dashboard"
        appearance={clerkAppearance}
      />
    </motion.div>
  );
}
