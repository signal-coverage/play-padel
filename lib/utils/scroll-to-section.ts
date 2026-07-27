import type { MouseEvent } from "react";

export function scrollToSection(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
) {
  if (!href.startsWith("#") || href === "#") return;

  const target = document.getElementById(href.slice(1));
  if (!target) return;

  event.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}
