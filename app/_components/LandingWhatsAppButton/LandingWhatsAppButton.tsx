import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { CONTACT } from "../LandingFooter/consts";

// A persistent contact affordance shown across the whole page, not scoped
// to any single section — same `fixed` positioning pattern LandingHeader
// uses for its floating bar, pinned to the opposite (bottom-right) corner
// instead. Reuses LandingFooter's CONTACT.phone rather than hardcoding a
// second copy of the number, stripped to digits-only for the wa.me deep
// link the same way LandingFooter already strips it for its own tel: link.
//
// Just a plain external link — no click handler, no state — so this
// renders on the server. The old framer-motion mount fade-in was purely
// decorative (not a scroll-triggered effect FadeInSection would replace)
// and is dropped rather than replicated: an always-visible floating
// button is one less thing blocking on JS.
export async function LandingWhatsAppButton() {
  const t = await getTranslations("LandingWhatsAppButton");
  const digitsOnly = CONTACT.phone.replace(/\D/g, "");

  return (
    <a
      href={`https://wa.me/${digitsOnly}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("ariaLabel")}
      className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-card hover:opacity-90 transition-opacity duration-200"
    >
      <MessageCircle aria-hidden="true" className="size-6" />
    </a>
  );
}
