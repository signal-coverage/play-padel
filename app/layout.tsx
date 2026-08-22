import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Public_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeFavicon } from "@/components/theme-favicon";
import { LocatorSetup } from "@/components/locator-setup";
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
const APP_DESCRIPTION =
  "Find available padel court appointments across different clubs in one place.";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: APP_NAME,
  description: APP_DESCRIPTION,
  applicationCategory: "SportsApplication",
  url: APP_URL,
  offers: {
    "@type": "Offer",
    category: "SaaS",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: {
    title: APP_NAME,
  },
  manifest: "/light/site.webmanifest",
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: ["/light/logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ["/light/logo.png"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
            <AuthProvider>{children}</AuthProvider>
            <Toaster />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
