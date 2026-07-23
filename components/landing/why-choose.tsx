import Image from "next/image";
import { MapPin, ShieldCheck, Users, Zap } from "lucide-react";

import { Reveal } from "./reveal";

/**
 * Asymmetric bento grid (1 large + 3 smaller cells - exact cell count for
 * 4 benefit items, no empty cells). At least three cells carry real visual
 * variation (a photo, three distinct tinted backgrounds), per Bento
 * Background Diversity.
 */
export function WhyChoose() {
  return (
    <section id="why-choose" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Everything a match needs, sorted.
          </h2>
          <p className="mt-4 text-[#585858]">
            From instant booking to verified clubs, every detail is handled
            so you can focus on the game.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          <Reveal className="relative overflow-hidden rounded-3xl md:col-span-2">
            <Image
              src="https://picsum.photos/seed/padel-club-community/1200/900"
              alt="Players gathering courtside between matches at a padel club"
              width={1200}
              height={900}
              className="h-72 w-full object-cover md:h-80"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#073D6B]/90 via-[#073D6B]/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
              <Zap className="size-6 text-[#DFFD36]" strokeWidth={2} />
              <h3 className="mt-3 text-xl font-semibold text-white">
                Book in real time
              </h3>
              <p className="mt-1 max-w-sm text-sm text-white/80">
                See open courts as they free up and lock yours before anyone
                else does.
              </p>
            </div>
          </Reveal>

          <Reveal
            delayMs={80}
            className="flex flex-col justify-center rounded-3xl bg-[#073D6B]/6 p-6 md:h-80 md:p-8"
          >
            <MapPin className="size-6 text-[#073D6B]" strokeWidth={2} />
            <h3 className="mt-3 text-xl font-semibold">Verified clubs only</h3>
            <p className="mt-1 text-sm text-[#585858]">
              Every court on the map is inspected and confirmed before it is
              listed.
            </p>
          </Reveal>

          <Reveal
            delayMs={160}
            className="flex flex-col justify-center rounded-3xl bg-[#DFFD36]/14 p-6 md:h-64 md:p-8"
          >
            <Users className="size-6 text-[#073D6B]" strokeWidth={2} />
            <h3 className="mt-3 text-xl font-semibold">
              Built for community
            </h3>
            <p className="mt-1 text-sm text-[#585858]">
              Join local groups, rate your matches, and build a regular
              foursome.
            </p>
          </Reveal>

          <Reveal
            delayMs={240}
            className="flex flex-col justify-center rounded-3xl bg-[#61C9A8]/14 p-6 md:col-span-2 md:h-64 md:p-8"
          >
            <ShieldCheck className="size-6 text-[#073D6B]" strokeWidth={2} />
            <h3 className="mt-3 text-xl font-semibold">Deposits, protected</h3>
            <p className="mt-1 text-sm text-[#585858]">
              Pay only what a club requires upfront, refunded automatically
              if it cancels.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
