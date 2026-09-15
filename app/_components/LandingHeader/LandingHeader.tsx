"use client";
import { useState, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { NAV, ease, SCROLL_THRESHOLD } from "./consts";
import { CONTAINER } from "@/lib/consts";
import { scrollToSection } from "@/lib/utils/scroll-to-section";
import { useAuth } from "@/hooks/use-auth";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function LandingHeader() {
  const t = useTranslations("LandingHeader");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const { user, loading } = useAuth();
  const isSignedIn = !loading && !!user;

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > SCROLL_THRESHOLD);
  });

  function handleMobileNavLinkClick(
    e: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    scrollToSection(e, href);
    setIsMenuOpen(false);
  }

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      {/* flex justify-between on mobile (nav below is hidden there, so it's
          just logo + the right-hand group) — md:grid md:grid-cols-3 once nav
          becomes visible, so it sits in its own real, equal-width center
          column instead of wherever justify-between's equal GAPS (not equal
          POSITIONS) happen to land it. justify-between only guarantees equal
          gaps between items, not that the middle item ends up at the
          container's true center — with the right-hand group (locale
          switcher + auth buttons) wider than the bare logo on the left, that
          pulled nav visibly off-center toward the logo side. Each child's
          own justify-self-* below (grid-only, a no-op under mobile's flex)
          is what actually anchors it to its column's start/center/end. */}
      <div
        className={`${CONTAINER} h-16 flex items-center justify-between md:grid md:grid-cols-3`}
      >
        <motion.div
          className="justify-self-start"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
        >
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/light/logo.svg"
              alt="Play Padel"
              width={20}
              height={20}
            />
            <span
              className={`font-bold text-[15px] tracking-tight transition-colors duration-300 ${
                isScrolled ? "text-foreground" : "text-white"
              }`}
            >
              Play Padel
            </span>
          </Link>
        </motion.div>

        <nav className="hidden md:flex items-center justify-self-center gap-7">
          {NAV.map((link, i) => (
            <motion.div
              key={link.labelKey}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 + i * 0.05, ease }}
            >
              <Link
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className={`text-sm font-medium transition-colors duration-300 ${
                  isScrolled
                    ? "text-foreground/70 hover:text-foreground"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {t(`nav.${link.labelKey}`)}
              </Link>
            </motion.div>
          ))}
        </nav>

        <motion.div
          className="flex items-center justify-self-end gap-2 sm:gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.27, ease }}
        >
          <LocaleSwitcher
            className={
              isScrolled
                ? "text-foreground/70 hover:bg-muted hover:text-foreground"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }
          />

          {!loading &&
            (isSignedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center bg-accent text-accent-foreground rounded-full px-4 sm:px-5 py-2 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {t("goToApp")}
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex items-center bg-accent text-accent-foreground rounded-full px-4 sm:px-5 py-2 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {t("signUp")}
                </Link>
                <Link
                  href="/login"
                  className={`hidden md:inline-flex text-sm font-medium transition-colors duration-300 ${
                    isScrolled
                      ? "text-foreground/70 hover:text-foreground"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {t("logIn")}
                </Link>
              </>
            ))}

          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={t("openMenu")}
                className={`md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border-[1.5px] transition-colors duration-300 ${
                  isScrolled
                    ? "border-foreground text-foreground"
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
                  <SheetClose asChild key={link.labelKey}>
                    <Link
                      href={link.href}
                      onClick={(e) => handleMobileNavLinkClick(e, link.href)}
                      className="py-3 text-[15px] font-medium text-foreground/80 border-b border-border hover:text-foreground"
                    >
                      {t(`nav.${link.labelKey}`)}
                    </Link>
                  </SheetClose>
                ))}
                {!isSignedIn && (
                  <SheetClose asChild>
                    <Link
                      href="/login"
                      className="py-3 text-[15px] font-medium text-foreground/80 border-b border-border hover:text-foreground"
                    >
                      {t("logIn")}
                    </Link>
                  </SheetClose>
                )}
              </nav>
              {!loading && (
                <div className="px-4 pb-4 mt-auto">
                  <SheetClose asChild>
                    <Link
                      href={isSignedIn ? "/dashboard" : "/signup"}
                      className="inline-flex w-full items-center justify-center bg-primary text-primary-foreground rounded-full px-5 py-3 text-sm font-semibold hover:bg-primary/90"
                    >
                      {isSignedIn ? t("goToApp") : t("tryForFree")}
                    </Link>
                  </SheetClose>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </motion.div>
      </div>
    </header>
  );
}
