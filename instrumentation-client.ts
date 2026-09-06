// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import * as amplitude from "@amplitude/unified";
import { initBotId } from "botid/client/core";

// Registers which routes get a BotID classification challenge attached
// client-side. Every path here must match a server-side checkBotId() call
// (lib/security/botGuard.ts's checkBot()) or that check silently can't
// classify the request — see docs/SECURITY.md. Deliberately excludes
// GET /api/player/clubs (15s-polling read endpoint, not a form submission —
// rate limiting alone covers it, see that route's own comment).
initBotId({
  protect: [
    { path: "/api/onboarding", method: "POST" },
    { path: "/api/player/reservations", method: "POST" },
    { path: "/api/player/waitlist", method: "POST" },
  ],
});

const amplitudeApiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
if (!amplitudeApiKey) {
  console.warn("Amplitude API key missing — analytics disabled");
} else {
  amplitude.initAll(amplitudeApiKey, {
    analytics: { autocapture: true },
    sessionReplay: { sampleRate: 1 },
  });
}

Sentry.init({
  dsn: "https://2c4d484b8ed2948003226bcbf3be3014@o4511929038340096.ingest.us.sentry.io/4511929053151232",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
