"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import "./globals.css";

const SUPPORT_EMAIL = "hello@playpadel.com";

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
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-background px-6 py-12 antialiased">
        <title>Something went wrong – Play Padel</title>
        <div className="w-full max-w-lg text-center">
          <span className="text-lg font-bold tracking-tight text-foreground">
            Play Padel
          </span>

          <h1 className="mt-10 text-[clamp(26px,3.5vw,36px)] font-bold tracking-[-0.02em] text-foreground">
            Something went wrong
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-[1.75] text-muted-foreground">
            A critical error occurred and the app couldn&apos;t recover on its
            own. Try again, or reach out if the problem keeps happening.
          </p>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Need help?{" "}
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
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
