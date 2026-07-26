"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu } from "lucide-react";
import { NAV, ease } from "./consts";
import { CONTAINER } from "@/lib/consts";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const SCROLL_THRESHOLD = 40;

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
          className="flex items-center gap-2 sm:gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.27, ease }}
        >
          <Link
            href="/signup"
            className={`inline-flex items-center border-[1.5px] rounded-full px-4 sm:px-5 py-2 text-sm font-semibold transition-all duration-300 ${
              isScrolled
                ? "border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white"
                : "border-white text-white hover:bg-white hover:text-[#073d6b]"
            }`}
          >
            Try for free
          </Link>
          <Link
            href="/login"
            className={`hidden md:inline-flex text-sm font-medium transition-colors duration-300 ${
              isScrolled
                ? "text-[#111111]/70 hover:text-[#111111]"
                : "text-white/70 hover:text-white"
            }`}
          >
            Log in
          </Link>

          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className={`md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border-[1.5px] transition-colors duration-300 ${
                  isScrolled
                    ? "border-[#111111] text-[#111111]"
                    : "border-white text-white"
                }`}
              >
                <Menu size={18} strokeWidth={2} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-4/5">
              <SheetHeader>
                <SheetTitle>Play Padel</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col px-4">
                {NAV.map((link) => (
                  <SheetClose asChild key={link.label}>
                    <Link
                      href={link.href}
                      className="py-3 text-[15px] font-medium text-[#111111]/80 border-b border-black/5 hover:text-[#111111]"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    href="/login"
                    className="py-3 text-[15px] font-medium text-[#111111]/80 border-b border-black/5 hover:text-[#111111]"
                  >
                    Log in
                  </Link>
                </SheetClose>
              </nav>
              <div className="px-4 pb-4 mt-auto">
                <SheetClose asChild>
                  <Link
                    href="/signup"
                    className="inline-flex w-full items-center justify-center bg-[#111111] text-white rounded-full px-5 py-3 text-sm font-semibold hover:bg-[#111111]/90"
                  >
                    Try for free
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </motion.div>
      </div>
    </header>
  );
}
