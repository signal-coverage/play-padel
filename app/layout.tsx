import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Public_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { NextIntlClientProvider } from "next-intl";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { SuccessCelebrationPortal } from "@/components/SuccessCelebration";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeFavicon } from "@/components/theme-favicon";
import { LocatorSetup } from "@/components/locator-setup";
import { getRequestLocale } from "@/i18n/getRequestLocale";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const APP_NAME = "Play Padel";
// Spanish-only while English is hidden site-wide (LocaleSwitcher removed,
// /en redirects to / — see i18n/getRequestLocale.ts). Revert to the English
// original ("Find available padel court appointments across different
// clubs in one place.") alongside that change once the real translation
// pass resumes and both languages are live again.
const APP_DESCRIPTION =
  "Encontrá turnos disponibles de pádel en distintos clubes, todo en un mismo lugar.";
// `||`, not `??`: an unset GitHub Actions secret is interpolated as `""`
// (not undefined), which `??` would let through straight into `new URL("")`.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: APP_NAME,
  description: APP_DESCRIPTION,
  applicationCategory: "SportsApplication",
  url: APP_URL,
  // Spanish-only for now — see APP_DESCRIPTION's own comment above. Add
  // "en" back once /en has real content again.
  inLanguage: ["es"],
  offers: {
    "@type": "Offer",
    category: "SaaS",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Reservá canchas de pádel online`,
    // Lets a future non-landing route (e.g. a club's public profile page)
    // set its own <title> while keeping "Play Padel" attached, without
    // every route having to repeat the brand name itself.
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: {
    title: APP_NAME,
  },
  manifest: "/light/site.webmanifest",
  alternates: {
    canonical: APP_URL,
  },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    url: APP_URL,
    type: "website",
    // Spanish-only for now — see APP_DESCRIPTION's own comment above. No
    // `alternateLocale` right now since there's no second language actually
    // live to point at; add "en_US" back alongside it.
    locale: "es_AR",
    // No `images` here — app/opengraph-image.tsx (the file-convention
    // route) generates a real 1200x630 branded card and Next wires up the
    // og:image tags for it automatically; listing a second, smaller image
    // here would only add a redundant, lower-quality fallback.
  },
  twitter: {
    // large-image card to match the 1200x630 image opengraph-image.tsx
    // generates — "summary"'s small thumbnail undersells a real card.
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  icons: {
    icon: [
      {
        url: "/light/favicon-96x96.png",
        type: "image/png",
        sizes: "96x96",
      },
      {
        url: "/light/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/light/favicon.ico",
      },
    ],
    apple: [
      {
        url: "/light/apple-touch-icon.png",
        sizes: "180x180",
      },
    ],
    shortcut: ["/light/favicon.ico"],
  },
};

// Separate from `metadata` per the App Router's own split (viewport-related
// tags can't be part of `metadata` since Next 14) — themeColor matches the
// landing page's pinned light theme background (see app/globals.css's
// `.theme-light` tokens), so the browser chrome/status bar on mobile reads
// as part of the page instead of defaulting to plain white or black.
export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={locale}
      className={`${publicSans.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <LocatorSetup />
        <Analytics />
        <SpeedInsights />
        <ClerkProvider ui={ui}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
          >
            <ThemeFavicon />
            <NextIntlClientProvider>
              <AuthProvider>{children}</AuthProvider>
            </NextIntlClientProvider>
            <Toaster position="bottom-right" />
            <SuccessCelebrationPortal />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
