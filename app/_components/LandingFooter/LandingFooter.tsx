"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CONTACT, FOOTER_COLUMNS, TAGLINE, ease } from "./consts";
import { CONTAINER } from "@/lib/consts";

export function LandingFooter() {
  const shouldReduce = useReducedMotion();

  return (
    <footer className="bg-[#0A0A0A] text-white overflow-hidden">
      <div className={`${CONTAINER} pt-20 pb-0`}>
        <motion.div
          className="flex flex-col md:flex-row md:justify-between gap-10 mb-20"
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease }}
        >
          <p className="text-[22px] md:text-[26px] leading-snug text-white/90 max-w-85">
            {TAGLINE}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-14 text-right">
            <div>
              <h4 className="text-[14px] font-semibold text-white/90 mb-5">
                Let&apos;s Talk
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

            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h4 className="text-[14px] font-semibold text-white/90 mb-5">
                  {column.title}
                </h4>
                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[14px] text-white/45 hover:text-white/80 transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="flex items-end justify-between gap-6 flex-wrap"
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
        >
          <div
            className="overflow-hidden leading-none text-[clamp(56px,11vw,180px)]"
            style={{ height: "0.80em" }}
          >
            <span className="block font-extrabold tracking-[-0.04em] text-[#DFFD36] whitespace-nowrap">
              Play Padel
            </span>
          </div>

          <div className="flex items-center gap-6 text-[13px] text-white/30 flex-wrap pb-12">
            <span>© 2026 Play Padel. All rights reserved.</span>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
