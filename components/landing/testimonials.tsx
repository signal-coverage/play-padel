import Image from "next/image";

import { Reveal } from "./reveal";

const FEATURED = {
  quote:
    "I used to spend more time messaging people than playing. Now I book a court and find a fourth in minutes.",
  name: "Martina Ibarra",
  role: "Club champion, San Isidro",
  seed: "padel-player-martina",
};

const SUPPORTING = [
  {
    quote: "The deposit system means nobody ghosts the group chat anymore.",
    name: "Franco Aguilera",
    role: "Weekend regular, Palermo",
    seed: "padel-player-franco",
  },
  {
    quote: "Found my regular Tuesday four through the local community here.",
    name: "Julieta Moreno",
    role: "League captain, Núñez",
    seed: "padel-player-julieta",
  },
];

/**
 * Asymmetric testimonial wall - one large featured quote beside two
 * stacked supporting quotes, distinct from both the Bento grid and the
 * carousel above it.
 */
export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Players who keep coming back.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Reveal className="rounded-3xl bg-[#073D6B] p-8 text-white md:col-span-2 md:p-10">
            <p className="text-xl leading-relaxed md:text-2xl">
              &ldquo;{FEATURED.quote}&rdquo;
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Image
                src={`https://picsum.photos/seed/${FEATURED.seed}/96/96`}
                alt={FEATURED.name}
                width={48}
                height={48}
                className="size-12 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-semibold">{FEATURED.name}</p>
                <p className="text-sm text-white/70">{FEATURED.role}</p>
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col gap-6">
            {SUPPORTING.map((testimonial, index) => (
              <Reveal
                key={testimonial.name}
                delayMs={index * 100}
                className="flex-1 rounded-3xl border border-border p-6"
              >
                <p className="text-base leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <Image
                    src={`https://picsum.photos/seed/${testimonial.seed}/80/80`}
                    alt={testimonial.name}
                    width={40}
                    height={40}
                    className="size-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-[#585858]">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
