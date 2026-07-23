import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Full-bleed CTA band with a visually impactful background image (per the
 * brief). Centered content is an intentional exception here (Section 4.3
 * override: the closing message IS the design), not a default hero.
 */
export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-28 md:py-36">
      <Image
        src="https://picsum.photos/seed/padel-night-match/2000/1200"
        alt="A padel court lit up at night, mid-rally"
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[#073D6B]/80" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Your next match is one booking away.
        </h2>
        <p className="mt-4 text-white/80">
          Courts open across the city, right now.
        </p>
        <Button
          render={<Link href="/sign-up" />}
          nativeButton={false}
          size="lg"
          className="mt-8 h-12 rounded-full bg-[#DFFD36] px-8 text-base text-black hover:bg-[#DFFD36]/85"
        >
          Join Now
        </Button>
      </div>
    </section>
  );
}
