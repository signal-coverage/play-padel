"use client";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ease } from "./consts";
import { CONTAINER } from "@/lib/consts";
import heroImage from "@/assets/images/tennis-paddles-balls-arrangement.jpg";

const PLAYERS: { name: string; photoUrl?: string }[] = [
  { name: "Ana" },
  { name: "Carlos" },
  { name: "Marta" },
  { name: "Sofia" },
];

export function LandingHero() {
  const shouldReduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden min-h-[calc(90svh-4rem)] flex items-end w-full pb-12">
      {/* Background image */}
      <Image
        src={heroImage}
        alt="Arrangement of padel paddles and balls"
        fill
        priority
        sizes="100vw"
        className="object-cover object-bottom"
      />

      <div className={`${CONTAINER} flex items-end justify-between w-full`}>
        <div className={`relative z-10 w-full ${CONTAINER}`}>
          <motion.div
            className="max-w-155"
            initial={shouldReduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
          >
            <h1 className="text-[clamp(36px,5vw,58px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-white">
              Play. <span className="text-[#dffd36]">Connect.</span> Elevate
              <br />
              Your Game with Our
              <br />
              <span className="text-[#dffd36]">Paddle Clubs.</span>
            </h1>

            <motion.div
              className="flex flex-wrap gap-3 mt-8"
              initial={shouldReduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18, ease }}
            >
              <Link
                href="#appointment"
                className="inline-flex items-center gap-2 bg-[#dffd36] text-[#073d6b] rounded-full px-6 py-3.5 text-[15px] font-semibold hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"
              >
                Explore Clubs
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            </motion.div>
            <p className="mt-24 text-[17px] text-white/80 leading-[1.75] max-w-110">
              Discover the fun, fast-paced world of paddle with top-notch
              courts, friendly matches, and a community built for connection.
            </p>
          </motion.div>
        </div>
        {/* Trust badge — glass; right edge aligned to the shared page container,
          matching the navbar's "Try for free" button */}
        <div className={`${CONTAINER}`}>
          <motion.div
            className="ml-auto w-fit flex items-center gap-2.5 bg-white/15 backdrop-blur-xl rounded-full pl-2 pr-4 py-1.5 border border-white/25 shadow-lg"
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            <div className="flex">
              {PLAYERS.map((player, i) => (
                <div
                  key={player.name}
                  className="relative w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold text-[#073d6b] bg-[#dffd36] border-2 border-white/80"
                  style={{ marginLeft: i === 0 ? 0 : -8 }}
                >
                  {player.photoUrl ? (
                    <Image
                      src={player.photoUrl}
                      alt={player.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    player.name.charAt(0)
                  )}
                </div>
              ))}
            </div>
            <span className="text-[13px] font-semibold text-white text-nowrap">
              +2,400 players
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
