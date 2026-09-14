"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/localeConstants";
import { setUserLocale } from "@/i18n/localeActions";
import { LOCALE_FLAGS } from "./consts";

// A plain toggle button, not a dropdown — with only two locales, a Select
// full of chrome (trigger, portal, options list) is more UI than the choice
// needs. Clicking flips straight to the other locale, shown as a flag +
// 2-letter code (e.g. "🇦🇷 ES"), subtle enough to sit quietly among the
// navbar's other icon-sized controls instead of competing with them.
//
// Flips the "locale" cookie via the setUserLocale server action, then
// refreshes so Server Components (which read the cookie through
// i18n/request.ts) re-render with the new messages. Wrapped in
// useTransition so the trigger can show a pending state instead of
// appearing to do nothing while the server round-trip resolves.
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextLocale: Locale = locale === "es" ? "en" : "es";

  function handleClick() {
    startTransition(async () => {
      await setUserLocale(nextLocale);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`${t("label")}: ${t(nextLocale)}`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      <span aria-hidden="true">{LOCALE_FLAGS[locale]}</span>
      <span className="uppercase tracking-wide">{locale}</span>
    </button>
  );
}
