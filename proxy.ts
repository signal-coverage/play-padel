import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/en",
  "/login(.*)",
  "/signup(.*)",
  "/sso-callback(.*)",
  "/onboarding(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  // Crawlers hit these with no Clerk session — without this they silently
  // redirected to /login, so Google could never actually read them (a
  // pre-existing bug, not introduced by the /en hreflang work above, but
  // one that defeats it if left unfixed).
  "/sitemap.xml",
  "/robots.txt",
  "/opengraph-image",
  "/api/webhooks(.*)",
  // Vercel Cron calls this with no Clerk session — it carries its own
  // CRON_SECRET bearer check instead (see app/api/cron/notifications/route.ts).
  "/api/cron/(.*)",
  // External uptime monitoring has no Clerk session either — see
  // app/api/health/route.ts.
  "/api/health",
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
