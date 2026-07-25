"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { NAV, ease } from "./consts";
import { CONTAINER } from "@/lib/consts";

const SCROLL_THRESHOLD = 40;

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > SCROLL_THRESHOLD);
  });

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md border-b border-black/5"
          : "bg-transparent"
      }`}
    >
      <div className={`${CONTAINER} h-16 flex items-center justify-between`}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
        >
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Play Padel" width={20} height={20} />
            <span
              className={`font-bold text-[15px] tracking-tight transition-colors duration-300 ${
                isScrolled ? "text-[#111111]" : "text-white"
              }`}
            >
              Play Padel
            </span>
          </Link>
        </motion.div>

        <nav className="hidden md:flex items-center gap-7">
          {NAV.map((link, i) => (
            <motion.div
              key={link.label}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 + i * 0.05, ease }}
            >
              <Link
                href={link.href}
                className={`text-sm font-medium transition-colors duration-300 ${
                  isScrolled
                    ? "text-[#111111]/70 hover:text-[#111111]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </nav>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.27, ease }}
        >
          <Link
            href="#appointment"
            className={`inline-flex items-center border-[1.5px] rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${
              isScrolled
                ? "border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white"
                : "border-white text-white hover:bg-white hover:text-[#073d6b]"
            }`}
          >
            Try for free
          </Link>
        </motion.div>
      </div>
    </header>
  );
}
