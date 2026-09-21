"use client";
import Link from "next/link";
import { scrollToSection } from "@/lib/utils/scroll-to-section";
import type { ScrollLinkProps } from "./types";

// A Link with an onClick handler can't be rendered by a Server Component
// parent directly (event handlers can't cross the server/client boundary
// as props), so every landing section that smooth-scrolls to an in-page
// anchor (header nav, footer columns, hero's secondary CTA) renders this
// small client island instead of wiring scrollToSection itself.
export function ScrollLink({
  href,
  className,
  children,
  onNavigate,
}: ScrollLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        scrollToSection(e, href);
        onNavigate?.();
      }}
    >
      {children}
    </Link>
  );
}
