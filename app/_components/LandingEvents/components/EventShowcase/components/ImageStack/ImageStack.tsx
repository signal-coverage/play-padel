"use client";
import { StackSlot } from "../StackSlot/StackSlot";
import type { ImageStackProps } from "./types";

export function ImageStack({ events, activeIndex, onSelect }: ImageStackProps) {
  return (
    <div className="flex gap-3 h-full w-full overflow-x-auto scrollbar-none">
      {events.map((event, index) => (
        <StackSlot
          key={event.title}
          event={event}
          isOpen={index === activeIndex}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
}
