import { redirect } from "next/navigation";

// English is temporarily hidden site-wide while SEO gets tuned for the
// Spanish-only site — see i18n/getRequestLocale.ts for the matching
// locale-forcing change. This route used to render the real English
// landing (LandingPage from @/app/_components/LandingPage, same component
// app/page.tsx still uses) with its own hreflang metadata; bring that back
// once the real translation pass happens instead of just this redirect.
export default function EnglishHomePage() {
  redirect("/");
}
