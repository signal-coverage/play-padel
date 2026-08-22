"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

const ICON_LINK_SELECTOR = [
  'link[rel="icon"]',
  'link[rel="shortcut icon"]',
  'link[rel="apple-touch-icon"]',
  'link[rel="manifest"]',
].join(",");

export function ThemeFavicon() {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    // Landing/auth surfaces pin themselves to light via the `.theme-light`
    // class (see globals.css) regardless of the dashboard theme toggle — the
    // favicon must follow that same pin instead of the raw resolved theme.
    const isLightLocked = document.querySelector(".theme-light") !== null;
    const effectiveTheme = isLightLocked ? "light" : resolvedTheme;
    if (effectiveTheme !== "light" && effectiveTheme !== "dark") return;

    const from = effectiveTheme === "dark" ? "/light/" : "/dark/";
    const to = effectiveTheme === "dark" ? "/dark/" : "/light/";

    document
      .querySelectorAll<HTMLLinkElement>(ICON_LINK_SELECTOR)
      .forEach((link) => {
        if (link.href.includes(from)) {
          link.href = link.href.replace(from, to);
        }
      });
  }, [resolvedTheme, pathname]);

  return null;
}
