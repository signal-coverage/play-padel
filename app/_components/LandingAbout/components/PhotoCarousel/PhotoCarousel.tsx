"use client";
import Image from "next/image";
import { ABOUT_IMAGES } from "../../consts";
import { CarouselDots } from "../CarouselDots";
import type { PhotoCarouselProps } from "./types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Embla (components/ui/carousel.tsx) measures DOM geometry synchronously
// on mount and needs its own client runtime — isolated here so the rest of
// LandingAbout (heading, copy, chips) can render on the server.
export function PhotoCarousel({ imageAlts }: PhotoCarouselProps) {
  return (
    <Carousel opts={{ loop: true }}>
      <CarouselContent className="ml-0">
        {ABOUT_IMAGES.map((image, i) => (
          <CarouselItem key={imageAlts[i]} className="pl-0">
            <div className="relative rounded-sm overflow-hidden aspect-4/3">
              <Image
                src={image}
                alt={imageAlts[i]}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                priority={i === 0}
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-3 border-none bg-background/80 text-foreground opacity-80 backdrop-blur-sm hover:bg-background hover:opacity-100" />
      <CarouselNext className="right-3 border-none bg-background/80 text-foreground opacity-80 backdrop-blur-sm hover:bg-background hover:opacity-100" />
      <CarouselDots />
    </Carousel>
  );
}
