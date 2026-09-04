import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/sso-callback(.*)",
  "/onboarding(.*)",
  "/api/webhooks(.*)",
  // Vercel Cron calls this with no Clerk session — it carries its own
  // CRON_SECRET bearer check instead (see app/api/cron/notifications/route.ts).
  "/api/cron/(.*)",
  // Same reasoning — these carry their own MEMBERSHIP_ADMIN_SECRET bearer
  // check instead of a Clerk session (see app/api/admin/club-status/route.ts).
  "/api/admin/(.*)",
  // The admin UI pages themselves (e.g. app/admin/club-status/page.tsx) have
  // no gate of their own either — every mutating call they make still
  // requires the same MEMBERSHIP_ADMIN_SECRET bearer secret above, entered
  // by hand on the page, not a Clerk session.
  "/admin/(.*)",
  "/invite-error(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
