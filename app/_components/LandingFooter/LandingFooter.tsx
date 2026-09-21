import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { ShareButton } from "@/app/_components/ShareButton";
import { ScrollLink } from "@/components/ScrollLink";
import { FadeInSection } from "@/components/FadeInSection";
import { CONTACT, FOOTER_COLUMNS } from "./consts";
import type { FooterColumnTranslation } from "./types";
import { CONTAINER } from "@/lib/consts";

// A single combined footer-with-CTA composition: a top CTA banner (no photo
// background — a thin dashed rule stands in for the "match line" motif
// instead of a photo + gradient scrim) followed by link columns, wordmark,
// and copyright below it. Only the column links' smooth-scroll behavior
// needs a client boundary (ScrollLink) and ShareButton (its own existing
// client component) — everything else is static markup, so the section
// itself renders on the server.
export async function LandingFooter() {
  const t = await getTranslations("LandingFooter");
  const currentYear = new Date().getFullYear();
  const columns = t.raw("columns") as FooterColumnTranslation[];

  return (
    <footer className="bg-[#0A0A0A] text-white overflow-hidden">
      <div className={`${CONTAINER} pt-20 pb-0`}>
        <FadeInSection className="text-center pb-16 border-b border-dashed border-white/15">
          <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-[-0.02em] text-white max-w-155 mx-auto mb-5 leading-tight">
            {t("cta.heading.line1")}
            <br />
            {t("cta.heading.line2")}
          </h2>
          <p className="text-[16px] text-white/70 max-w-120 mx-auto mb-9 leading-[1.75]">
            {t("cta.description", { brand: "Play Padel" })}
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-sm px-7 py-3.5 text-[15px] font-semibold hover:opacity-90 transition-opacity duration-200"
          >
            {t("cta.ctaPrimary")}
            <ArrowUpRight size={15} strokeWidth={2.5} />
          </Link>
        </FadeInSection>

        <FadeInSection
          className="flex flex-col md:flex-row md:justify-between gap-10 my-15"
          delayMs={80}
        >
          <p className="text-[22px] md:text-[26px] leading-snug text-white/90 max-w-85 text-pretty">
            {t("tagline")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-14 text-left sm:text-right">
            <div>
              <h4 className="text-[14px] font-semibold text-white/90 mb-5">
                {t("talkToUs")}
              </h4>
              <ul className="flex flex-col gap-3 text-[14px] text-white/45">
                <li>
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="hover:text-white/80 transition-colors"
                  >
                    {CONTACT.email}
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${CONTACT.phone.replace(/[^+\d]/g, "")}`}
                    className="hover:text-white/80 transition-colors"
                  >
                    {CONTACT.phone}
                  </a>
                </li>
              </ul>
            </div>

            {FOOTER_COLUMNS.map((column, columnIndex) => (
              <div key={column.hrefs.join(",")}>
                <h4 className="text-[14px] font-semibold text-white/90 mb-5">
                  {columns[columnIndex].title}
                </h4>
                <ul className="flex flex-col gap-3">
                  {column.hrefs.map((href, linkIndex) => (
                    <li key={href}>
                      <ScrollLink
                        href={href}
                        className="text-[14px] text-white/45 hover:text-white/80 transition-colors"
                      >
                        {columns[columnIndex].links[linkIndex].label}
                      </ScrollLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </FadeInSection>

        <FadeInSection
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
          delayMs={100}
        >
          <div className="overflow-hidden leading-none text-[clamp(56px,11vw,100px)] pb-4">
            <span className="block font-extrabold tracking-[-0.04em] text-[#DFFD36] whitespace-nowrap">
              Play Padel
            </span>
          </div>

          <div className="flex items-center gap-6 text-[13px] text-white/30 flex-wrap pb-6 sm:pb-12">
            <span>
              {t("copyright", { year: currentYear, brand: "Play Padel" })}
            </span>
            <Link
              href="/privacy"
              className="hover:text-white/60 transition-colors"
            >
              {t("privacy")}
            </Link>
            <Link
              href="/terms"
              className="hover:text-white/60 transition-colors"
            >
              {t("terms")}
            </Link>
            <ShareButton />
          </div>
        </FadeInSection>
      </div>
    </footer>
  );
}
