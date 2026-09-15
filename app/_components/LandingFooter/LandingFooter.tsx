"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ShareButton } from "@/app/_components/ShareButton";
import { CONTACT, FOOTER_COLUMNS, ease } from "./consts";
import type { FooterColumnTranslation } from "./types";
import { CONTAINER } from "@/lib/consts";
import { scrollToSection } from "@/lib/utils/scroll-to-section";

export function LandingFooter() {
  const t = useTranslations("LandingFooter");
  const shouldReduce = useReducedMotion();
  const currentYear = new Date().getFullYear();
  const columns = t.raw("columns") as FooterColumnTranslation[];

  return (
    <footer className="bg-[#0A0A0A] text-white overflow-hidden">
      <div className={`${CONTAINER} pt-20 pb-0`}>
        <motion.div
          className="flex flex-col md:flex-row md:justify-between gap-10 mb-15"
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease }}
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
                      <Link
                        href={href}
                        onClick={(e) => scrollToSection(e, href)}
                        className="text-[14px] text-white/45 hover:text-white/80 transition-colors"
                      >
                        {columns[columnIndex].links[linkIndex].label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
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
        </motion.div>
      </div>
    </footer>
  );
}
