import type { MouseEvent } from "react";

export function scrollToSection(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
) {
  if (!href.startsWith("#") || href === "#") return;

  const target = document.getElementById(href.slice(1));
  if (!target) {
    // The section only exists on the landing page — if LandingHeader or
    // LandingFooter is reused on another page (e.g. /terms, /privacy), send
    // the visitor there instead of leaving the click a no-op.
    if (window.location.pathname !== "/") {
      event.preventDefault();
      window.location.href = `/${href}`;
    }
    return;
  }

  event.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}
