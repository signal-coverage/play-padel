"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCarousel, type CarouselApi } from "@/components/ui/carousel";

// Overlay dot indicators for LandingAbout's in-frame photo carousel — reads
// the selected slide straight from the shared Carousel's embla API rather
// than tracking its own duplicate state, so it can never fall out of sync
// with the actual slide the prev/next arrows or a swipe land on.
export function CarouselDots() {
  const t = useTranslations("LandingAbout");
  const { api } = useCarousel();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slideCount, setSlideCount] = useState(0);

  const onSelect = useCallback((api: NonNullable<CarouselApi>) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    // Initial sync from embla's just-created API — same one-time-read
    // pattern already used by Carousel itself (components/ui/carousel.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlideCount(api.scrollSnapList().length);
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  if (slideCount <= 1) return null;

  return (
    <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
      {Array.from({ length: slideCount }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={t("goToSlide", { index: i + 1 })}
          aria-current={i === selectedIndex}
          onClick={() => api?.scrollTo(i)}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === selectedIndex ? "w-5 bg-white" : "w-1.5 bg-white/60"
          }`}
        />
      ))}
    </div>
  );
}
