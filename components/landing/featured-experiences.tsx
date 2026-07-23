import Image from "next/image";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { Reveal } from "./reveal";

const EXPERIENCES = [
  {
    label: "Upcoming matches",
    copy: "Drop into an open match starting this week.",
    seed: "padel-upcoming-match",
  },
  {
    label: "Local communities",
    copy: "Play regularly with people from your neighborhood.",
    seed: "padel-local-community",
  },
  {
    label: "Clubs near you",
    copy: "Browse courts across the city, sorted by distance.",
    seed: "padel-club-lounge",
  },
  {
    label: "Social events",
    copy: "Mixers, clinics, and after-match drinks, all in one calendar.",
    seed: "padel-social-event",
  },
  {
    label: "Competitive games",
    copy: "Ranked matches for players chasing a real ladder.",
    seed: "padel-competitive-game",
  },
];

/**
 * Horizontal drag carousel (breadth-heavy list per Section 4.9), distinct
 * from the Bento grid above and the quote wall below.
 */
export function FeaturedExperiences() {
  return (
    <section id="experiences" className="bg-[#585858]/5 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Ways to play
            </h2>
            <p className="mt-4 text-[#585858]">
              Whatever kind of game you are looking for, there is a slot for
              it this week.
            </p>
          </div>
        </Reveal>

        <Carousel
          opts={{ align: "start", loop: false }}
          className="mt-12"
        >
          <CarouselContent>
            {EXPERIENCES.map((experience) => (
              <CarouselItem
                key={experience.label}
                className="basis-[85%] sm:basis-1/2 lg:basis-1/3"
              >
                <div className="overflow-hidden rounded-3xl border border-border">
                  <Image
                    src={`https://picsum.photos/seed/${experience.seed}/800/600`}
                    alt={experience.copy}
                    width={800}
                    height={600}
                    className="h-56 w-full object-cover"
                  />
                  <div className="p-5">
                    <h3 className="text-lg font-semibold">
                      {experience.label}
                    </h3>
                    <p className="mt-1 text-sm text-[#585858]">
                      {experience.copy}
                    </p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden lg:flex" />
          <CarouselNext className="hidden lg:flex" />
        </Carousel>
      </div>
    </section>
  );
}
