"use client";
import { useState } from "react";
import { EVENTS } from "../../consts";
import { ImageStack } from "./components/ImageStack/ImageStack";
import { DetailPanel } from "./components/DetailPanel/DetailPanel";

export function EventShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = EVENTS.length;

  const goTo = (index: number) => setActiveIndex(((index % total) + total) % total);
  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  return (
    <div className="flex flex-col md:flex-row gap-10">
      <div className="w-full md:w-[60%] h-90 md:h-115">
        <ImageStack events={EVENTS} activeIndex={activeIndex} onSelect={goTo} />
      </div>
      <div className="w-full md:w-[40%]">
        <DetailPanel
          event={EVENTS[activeIndex]}
          index={activeIndex}
          total={total}
          onPrev={goPrev}
          onNext={goNext}
        />
      </div>
    </div>
  );
}
