import { getTranslations } from "next-intl/server";
import { NAV } from "./consts";
import { CONTAINER } from "@/lib/consts";
import { ScrollLink } from "@/components/ScrollLink";
import { LogoLink } from "./components/LogoLink";
import { HeaderActions } from "./components/HeaderActions";

// The header stays a single, always-solid floating bar: LandingHero runs a
// centered layout with no full-bleed photo behind the header, so there is
// no "transparent over the hero, solid once scrolled" state to track and no
// scroll listener is needed. Only the logo's scroll-to-top click and the
// auth-aware CTA/mobile-Sheet cluster need a client boundary (see
// components/LogoLink and components/HeaderActions) — the bar shell and
// desktop nav render on the server.
export async function LandingHeader() {
  const t = await getTranslations("LandingHeader");

  return (
    <header className="fixed top-3 inset-x-0 z-50 px-4">
      <div
        className={`${CONTAINER} h-14 flex items-center justify-between md:grid md:grid-cols-3 rounded-sm border border-border bg-background/95 backdrop-blur-md px-4 sm:px-6`}
      >
        <div className="justify-self-start">
          <LogoLink />
        </div>

        <nav className="hidden md:flex items-center justify-self-center gap-7">
          {NAV.map((link) => (
            <ScrollLink
              key={link.labelKey}
              href={link.href}
              className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors duration-200"
            >
              {t(`nav.${link.labelKey}`)}
            </ScrollLink>
          ))}
        </nav>

        <HeaderActions nav={NAV} />
      </div>
    </header>
  );
}
