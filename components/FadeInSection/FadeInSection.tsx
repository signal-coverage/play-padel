"use client";
import { createElement } from "react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils/utils";
import type { FadeInSectionProps } from "./types";

// The lightweight, framer-motion-free replacement for the landing page's
// old `motion.div`/`whileInView` fade-in — this is the ONLY new
// client-side animation code the landing-page perf pass adds. Ships no
// animation library: an IntersectionObserver-backed hook (useInView) plus
// two Tailwind utility classes toggled by state.
export function FadeInSection({
  children,
  as = "div",
  className,
  threshold,
  rootMargin,
  delayMs,
}: FadeInSectionProps) {
  const { ref, isInView } = useInView<HTMLElement>({ threshold, rootMargin });

  return createElement(
    as,
    {
      ref,
      className: cn(
        "transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className,
      ),
      style: delayMs ? { transitionDelay: `${delayMs}ms` } : undefined,
    },
    children,
  );
}
