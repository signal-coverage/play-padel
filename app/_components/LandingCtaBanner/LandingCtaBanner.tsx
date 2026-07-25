"use client";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ease, bannerImage } from "./consts";
import { CONTAINER } from "@/lib/consts";

export function LandingCtaBanner() {
  const shouldReduce = useReducedMotion();

  return (
    <section id="appointment" className={`${CONTAINER} py-14`}>
      <motion.div
        className="relative rounded-[40px] overflow-hidden px-6 py-24 text-center"
        initial={shouldReduce ? false : { opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease }}
      >
        <Image
          src={bannerImage}
          alt=""
          fill
          sizes="(min-width: 1400px) 1400px, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/55 to-black/70" />

        <motion.h2
          className="relative z-10 text-[clamp(28px,4vw,44px)] font-bold tracking-[-0.02em] text-white max-w-155 mx-auto mb-5 leading-tight"
          initial={shouldReduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.06, ease }}
        >
          Be Part of a Paddle Club
          <br />
          That Feels Like Home
        </motion.h2>

        <motion.p
          className="relative z-10 text-[16px] text-white/80 max-w-120 mx-auto mb-9 leading-[1.75]"
          initial={shouldReduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.12, ease }}
        >
          Join a vibrant community of paddle lovers where every match brings new
          friends, new skills, and endless fun on and off the court.
        </motion.p>

        <motion.div
          className="relative z-10"
          initial={shouldReduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.18, ease }}
        >
          <Link
            href="/signup"
            className="inline-flex items-center bg-[#DFFD36] text-[#111111] rounded-full px-7 py-3.5 text-[15px] font-semibold hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"
          >
            Let&apos;s Play Paddle!
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
