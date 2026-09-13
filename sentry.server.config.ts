// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://2c4d484b8ed2948003226bcbf3be3014@o4511929038340096.ingest.us.sentry.io/4511929053151232",

  // Full sampling in development; a lower rate in production to bound
  // Sentry's trace volume/cost at real traffic (no env-aware helper exists
  // for this in lib/env.ts, so read NODE_ENV directly, same as elsewhere in
  // this codebase).
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});
