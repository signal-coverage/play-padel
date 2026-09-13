import { withSentryConfig } from "@sentry/nextjs";
import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

// Third-party hosts this app's own pages genuinely load, kept here (not
// inlined into the policy string below) so the reasoning for each entry is
// attached to the one place that would need updating if a provider changes:
//   - Clerk: *.clerk.accounts.dev covers every dev/preview instance; the
//     custom-domain Frontend API host for prod is decoded from the live
//     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY value (see .env.prod) — re-check this
//     if that key or a Clerk custom domain is ever changed.
//   - challenges.cloudflare.com: Clerk's bot-protection challenge (Turnstile).
//   - sdk.mercadopago.com / *.mercadopago.com / http2.mlstatic.com: the
//     CardPayment Brick (@mercadopago/sdk-react, see
//     components/PlanSelectionModal/components/CardTokenForm) renders a real
//     MercadoPago-hosted iframe for card entry — this is NOT the Checkout Pro
//     redirect flow (that's a plain top-level navigation, needs no CSP entry).
//   - img.clerk.com: Clerk-hosted user avatars.
//   - api2.amplitude.com: @amplitude/unified ships as a bundled module (no
//     external <script> tag), but still calls out to Amplitude's ingestion
//     API directly over fetch/XHR.
//   - *.sentry.io: defensive — normal error/session reporting already goes
//     through the same-origin /monitoring tunnel (see the Sentry config
//     below), but not every Sentry SDK feature is guaranteed to use it.
// Google Fonts is deliberately NOT listed: next/font/google self-hosts the
// font files at build time, so there is no runtime request to
// fonts.googleapis.com/fonts.gstatic.com to allow.
const CLERK_FRONTEND_API_HOST = "clerk.play-padel-zeta.vercel.app";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // 'unsafe-inline' is required for Next.js's own inline bootstrap scripts —
  // this repo doesn't yet use a nonce-based CSP (would need per-request
  // nonce injection via middleware). It still blocks any externally-hosted
  // script that isn't explicitly allow-listed below, which is the bulk of
  // real-world script-injection XSS.
  `script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://${CLERK_FRONTEND_API_HOST} https://challenges.cloudflare.com https://sdk.mercadopago.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://images.unsplash.com https://i.pravatar.cc https://picsum.photos https://img.clerk.com https://*.mercadopago.com https://http2.mlstatic.com`,
  "font-src 'self' data:",
  `connect-src 'self' https://*.clerk.accounts.dev https://${CLERK_FRONTEND_API_HOST} https://api.mercadopago.com https://api2.amplitude.com https://*.sentry.io https://*.ingest.sentry.io https://challenges.cloudflare.com`,
  "frame-src 'self' https://challenges.cloudflare.com https://*.mercadopago.com",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Exported (not just used inline) so a test can assert on it directly rather
// than reaching into the wrapped `withSentryConfig(withBotId(...))` default
// export, which would otherwise require exercising Sentry's/BotId's own
// config-transform logic just to check a header list.
export const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  // frame-ancestors above already covers modern browsers; kept for older ones.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  turbopack: {
    rules: {
      "**/*.{tsx,jsx}": {
        loaders: [
          {
            loader: "@locator/webpack-loader",
            options: { env: "development" },
          },
        ],
      },
    },
  },
  allowedDevOrigins: [
    "192.168.100.6",
    "daybed-daredevil-turtle.ngrok-free.dev",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default withSentryConfig(withBotId(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "signal-coverage",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
