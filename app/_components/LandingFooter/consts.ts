import type { FooterLinkColumn } from "./types";

export { ease } from "@/lib/consts/animation";

export const TAGLINE =
  "We're more than a paddle club — we're a community that lives for rallies, laughs, and friendly competition.";

export const CONTACT = {
  email: "hello@playpadel.com",
  phone: "+1 (021) 123-4567",
};

export const FOOTER_COLUMNS: FooterLinkColumn[] = [
  {
    title: "Navigate",
    links: [
      { label: "Homepage", href: "/" },
      { label: "About", href: "#about" },
      { label: "Facilities", href: "#features" },
      { label: "Events", href: "#modules" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQs", href: "#faq" },
      { label: "Contact", href: "#appointment" },
      { label: "Help Center", href: "#" },
      { label: "Live Chat Support", href: "#" },
    ],
  },
  {
    title: "Social Media",
    links: [
      { label: "Facebook", href: "#" },
      { label: "Instagram", href: "#" },
      { label: "Youtube", href: "#" },
      { label: "LinkedIn", href: "#" },
    ],
  },
];
