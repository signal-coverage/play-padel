import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Full-bleed immersive-photo hero (design-taste-frontend Hero Paradigms:
 * "Video / Media Mask Hero" family, adapted to a static photo per the
 * brief's "Full-width immersive background image"). Content anchors
 * bottom-left, not centered (DESIGN_VARIANCE 8 anti-center-bias).
 */
export function Hero() {
  return (
    <section className="relative flex min-h-dvh items-end overflow-hidden">
      <Image
        src="https://picsum.photos/seed/padel-court-action/2400/1350"
        alt="Two players volleying at the net during a padel match on an illuminated court"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-[#073D6B]/95 via-[#073D6B]/45 to-[#073D6B]/10"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-24 sm:px-6 md:pb-24">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
            Book a court. Find your match.
          </h1>
          <p className="mt-5 max-w-[38ch] text-base text-white/85 md:text-lg">
            Real-time availability at verified clubs, matched with players
            ready to play right now.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              render={<Link href="/sign-up" />}
              nativeButton={false}
              size="lg"
              className="h-12 rounded-full bg-[#DFFD36] px-7 text-base text-black hover:bg-[#DFFD36]/85"
            >
              Join Now
            </Button>
            <a
              href="#why-choose"
              className="text-sm font-medium text-white underline-offset-4 hover:underline"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
