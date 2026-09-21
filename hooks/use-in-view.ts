"use client";
import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** Fraction of the element that must be visible to count as "in view". */
  threshold?: number;
  /** Same shape as IntersectionObserver's own rootMargin. */
  rootMargin?: string;
  /**
   * Once the element has entered the viewport, keep it marked in-view even
   * after it scrolls back out — mirrors framer-motion's
   * `viewport={{ once: true }}`, which every landing section currently
   * sets, so converting away from framer-motion can't introduce a replay
   * on scroll-back-up that wasn't there before.
   */
  triggerOnce?: boolean;
}

interface UseInViewResult<T extends Element> {
  ref: React.RefObject<T | null>;
  isInView: boolean;
}

const DEFAULT_THRESHOLD = 0.15;
const DEFAULT_ROOT_MARGIN = "0px 0px -80px 0px";

/**
 * Generic scroll-into-view hook backed by IntersectionObserver — the
 * lightweight replacement for framer-motion's `whileInView`, used by
 * FadeInSection so landing sections no longer need to ship framer-motion
 * (or "use client") just to fade in on scroll.
 */
export function useInView<T extends Element = Element>({
  threshold = DEFAULT_THRESHOLD,
  rootMargin = DEFAULT_ROOT_MARGIN,
  triggerOnce = true,
}: UseInViewOptions = {}): UseInViewResult<T> {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) observer.disconnect();
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isInView };
}
