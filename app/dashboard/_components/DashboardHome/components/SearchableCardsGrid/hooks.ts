import { useCallback, useEffect, useState } from "react";

// A couple of px of tolerance for sub-pixel scroll-height rounding.
const SCROLL_END_THRESHOLD = 4;

// Uses a callback ref (backed by state) instead of a plain useRef, since the
// scrollable node mounts/unmounts as the bento and filtered views swap in and
// out — a plain ref's `.current` change wouldn't re-trigger this effect.
//
// Returns a tuple, not `{ ref, canScrollMore }`: eslint-plugin-react-hooks'
// `refs` rule treats any object containing a `ref` property as ref-like and
// flags every property read off it, even unrelated ones like a boolean.
export function useScrollAffordance<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [rawCanScrollMore, setRawCanScrollMore] = useState(false);
  const ref = useCallback((el: T | null) => setNode(el), []);

  useEffect(() => {
    if (!node) return;

    const updateCanScrollMore = () => {
      const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
      setRawCanScrollMore(remaining > SCROLL_END_THRESHOLD);
    };

    updateCanScrollMore();
    node.addEventListener("scroll", updateCanScrollMore, { passive: true });
    const resizeObserver = new ResizeObserver(updateCanScrollMore);
    resizeObserver.observe(node);

    return () => {
      node.removeEventListener("scroll", updateCanScrollMore);
      resizeObserver.disconnect();
    };
  }, [node]);

  const canScrollMore = node ? rawCanScrollMore : false;

  return [ref, canScrollMore] as const;
}
