"use client";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ease } from "./consts";
import { CONTAINER } from "@/lib/consts";
import { scrollToSection } from "@/lib/utils/scroll-to-section";
import heroImage from "@/assets/images/tennis-paddles-balls-arrangement.jpg";

export function LandingHero() {
  const shouldReduce = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden min-h-[calc(90svh-4rem)] flex items-end w-full pt-28 pb-12">
      {/* Background image */}
      <Image
        src={heroImage}
        alt="Arrangement of padel paddles and balls"
        fill
        priority
        sizes="100vw"
        className="object-cover object-bottom"
      />
      {/* Readability scrim — same pattern as LandingCtaBanner's white-text-on-photo
        overlay, adapted to a bottom-anchored gradient since the hero's text
        sits at the bottom of the image rather than centered over it. */}
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/35 to-transparent" />

      <div className={`relative z-10 w-full ${CONTAINER}`}>
        <motion.div
          className="max-w-155"
          initial={shouldReduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <h1 className="text-[clamp(36px,5vw,58px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-white">
            Book Courts. <span className="text-accent">Connect.</span> Run
            <br />
            Your Club with Our
            <br />
            <span className="text-accent">Padel Platform.</span>
          </h1>

          <motion.div
            className="flex flex-wrap gap-3 mt-8"
            initial={shouldReduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease }}
          >
            <Link
              href="#appointment"
              onClick={(e) => scrollToSection(e, "#appointment")}
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full px-6 py-3.5 text-[15px] font-semibold hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"
            >
              Explore Clubs
              <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
          </motion.div>
          <p className="mt-8 md:mt-24 text-[17px] text-white/80 leading-[1.75] max-w-110">
            Real-time court booking for players, and complete club management
            tools for owners — all in one platform built for padel.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
