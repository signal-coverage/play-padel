"use client"; // Error boundaries must be Client Components

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import enMessages from "@/messages/en.json";
import esMessages from "@/messages/es.json";
import { LOCALE_COOKIE_NAME, type Locale } from "@/i18n/localeConstants";
import "./globals.css";

const SUPPORT_EMAIL = "signal.coverage.lead@gmail.com";

// None of RootLayout's providers (fonts, theme, auth, NextIntlClientProvider)
// are available here — this file entirely replaces the root layout when it
// throws, so it must define its own <html>/<body> and can't reach the
// cookie-based locale the normal server-rendered path uses. Instead it reads
// the same "locale" cookie directly on the client and stands up its own
// minimal NextIntlClientProvider around just this page's copy.
function readLocaleCookie(): Locale {
  // Spanish default, matching i18n/locale.ts's DEFAULT_LOCALE.
  if (typeof document === "undefined") return "es";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=(en|es)`),
  );
  return match?.[1] === "en" ? "en" : "es";
}

function GlobalErrorContent({ reset }: { reset: () => void }) {
  const t = useTranslations("GlobalError");

  return (
    <body className="flex min-h-dvh items-center justify-center bg-background px-6 py-12 antialiased">
      <title>{t("titleTemplate", { brand: "Play Padel" })}</title>
      <div className="w-full max-w-lg text-center">
        <span className="text-lg font-bold tracking-tight text-foreground">
          Play Padel
        </span>

        <h1 className="mt-10 text-[clamp(26px,3.5vw,36px)] font-bold tracking-[-0.02em] text-foreground">
          {t("heading")}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-[1.75] text-muted-foreground">
          {t("description")}
        </p>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {t("needHelp")}{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RotateCw className="h-4 w-4" strokeWidth={2} />
          {t("tryAgain")}
        </button>
      </div>
    </body>
  );
}

// This replaces the root layout entirely when an error is thrown within it,
// so it must define its own <html>/<body> and re-import global styles —
// none of RootLayout's providers (fonts, theme, auth) are available here.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Lazy initializer (not an effect + setState) — the cookie only needs to
  // be read once, on mount; reading it here avoids the extra cascading
  // render an effect-driven setState would trigger.
  const [locale] = useState<Locale>(() => readLocaleCookie());

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={locale}>
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "es" ? esMessages : enMessages}
      >
        <GlobalErrorContent reset={reset} />
      </NextIntlClientProvider>
    </html>
  );
}
