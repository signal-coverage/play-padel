"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import esMessages from "@/messages/es.json";
import "./globals.css";

const SUPPORT_EMAIL = "signal.coverage.lead@gmail.com";

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
// The app is Spanish-only, so this hardcodes "es" directly rather than
// resolving a locale — there is no per-request/per-user value to read here
// anyway, since none of RootLayout's normal locale-resolution path is
// reachable from this standalone error boundary.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <GlobalErrorContent reset={reset} />
      </NextIntlClientProvider>
    </html>
  );
}
