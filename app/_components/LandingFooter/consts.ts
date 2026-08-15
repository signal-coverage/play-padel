import type { FooterLinkColumn } from "./types";

export { ease } from "@/lib/consts/animation";

export const TAGLINE =
  "The platform padel clubs and players use to book, manage, and play — without the back-and-forth.";

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
      { label: "Features", href: "#features" },
    ],
  },
  {
    title: "Support",
    links: [{ label: "Contact", href: "#appointment" }],
  },
];
