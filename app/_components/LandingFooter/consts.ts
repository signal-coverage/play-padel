import type { FooterLinkColumn } from "./types";

export { ease } from "@/lib/consts/animation";

// Not translated — a real address/phone number, not language-dependent UI
// copy. Tagline copy lives in messages/*.json's LandingFooter.tagline.
export const CONTACT = {
  email: "signal.coverage.lead@gmail.com",
  phone: "+54 381 663-1856",
};

// Anchor targets only, in the same order as messages/*.json's
// LandingFooter.columns (and each column's links) — titles/labels are
// translated text, matched positionally.
export const FOOTER_COLUMNS: FooterLinkColumn[] = [
  { hrefs: ["/", "#about", "#features"] },
  { hrefs: ["#appointment"] },
];
