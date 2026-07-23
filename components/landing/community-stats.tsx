import { Reveal } from "./reveal";

const STATS = [
  { value: "12,438", label: "active players" },
  { value: "3,180", label: "matches booked this month" },
  { value: "42", label: "partner clubs" },
  { value: "4.8/5", label: "average court rating" },
];

/**
 * Full-width stat band (Metric Strip layout family) - deliberately not a
 * card grid, distinguishing it from the Bento section further down the
 * page (Section-Layout-Repetition discipline).
 */
export function CommunityStats() {
  return (
    <section className="bg-[#073D6B] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            A community that actually shows up.
          </h2>
          <p className="mt-4 max-w-[60ch] text-white/75">
            Padel is better with regulars, not strangers who cancel an hour
            before. Rebote connects you with players and clubs that keep
            coming back.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-y-10 divide-y divide-white/10 md:grid-cols-4 md:gap-0 md:divide-y-0 md:divide-x">
          {STATS.map((stat, index) => (
            <Reveal
              key={stat.label}
              delayMs={index * 80}
              className="pt-8 first:pt-0 md:px-8 md:pt-0 md:first:pl-0"
            >
              <p className="font-mono text-4xl font-semibold tabular-nums text-[#DFFD36] md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-white/70">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
