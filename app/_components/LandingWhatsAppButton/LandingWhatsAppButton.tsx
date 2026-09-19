"use client";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { CONTACT } from "../LandingFooter/consts";
import { ease } from "@/lib/consts/animation";

// A persistent contact affordance shown across the whole page, not scoped
// to any single section — same `fixed` positioning pattern LandingHeader
// uses for its floating bar, pinned to the opposite (bottom-right) corner
// instead. Reuses LandingFooter's CONTACT.phone rather than hardcoding a
// second copy of the number, stripped to digits-only for the wa.me deep
// link the same way LandingFooter already strips it for its own tel: link.
export function LandingWhatsAppButton() {
  const t = useTranslations("LandingWhatsAppButton");
  const digitsOnly = CONTACT.phone.replace(/\D/g, "");

  return (
    <motion.a
      href={`https://wa.me/${digitsOnly}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("ariaLabel")}
      className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-card hover:opacity-90 transition-opacity duration-200"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.6, ease }}
    >
      <MessageCircle aria-hidden="true" className="size-6" />
    </motion.a>
  );
}
