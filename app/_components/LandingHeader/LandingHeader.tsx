"use client";
import { useState, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { NAV, ease } from "./consts";
import { CONTAINER } from "@/lib/consts";
import { scrollToSection } from "@/lib/utils/scroll-to-section";
import { useAuth } from "@/hooks/use-auth";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// The header stays a single, always-solid floating bar: LandingHero runs a
// centered layout with no full-bleed photo behind the header, so there is
// no "transparent over the hero, solid once scrolled" state to track and no
// scroll listener is needed. The auth-aware CTA and mobile Sheet logic are
// standard reuse.
export function LandingHeader() {
  const t = useTranslations("LandingHeader");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const isSignedIn = !loading && !!user;

  function handleMobileNavLinkClick(
    e: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    scrollToSection(e, href);
    setIsMenuOpen(false);
  }

  function handleLogoClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <header className="fixed top-3 inset-x-0 z-50 px-4">
      <div
        className={`${CONTAINER} h-14 flex items-center justify-between md:grid md:grid-cols-3 rounded-sm border border-border bg-background/95 backdrop-blur-md px-4 sm:px-6`}
      >
        <motion.div
          className="justify-self-start"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
        >
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex items-center gap-1.5"
          >
            <Image
              src="/light/logo.svg"
              alt="Play Padel"
              width={17}
              height={17}
            />
            <span className="font-bold text-sm tracking-tight text-foreground">
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
                className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors duration-200"
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
          {!loading &&
            (isSignedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center bg-accent text-accent-foreground rounded-sm px-3.5 sm:px-4 py-1.5 text-sm font-semibold border border-transparent hover:border-foreground/20 transition-colors duration-200"
              >
                {t("goToApp")}
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex items-center bg-accent text-accent-foreground rounded-sm px-3.5 sm:px-4 py-1.5 text-sm font-semibold border border-transparent hover:border-foreground/20 transition-colors duration-200"
                >
                  {t("signUp")}
                </Link>
                <Link
                  href="/login"
                  className="hidden md:inline-flex text-sm font-medium text-foreground/70 hover:text-foreground transition-colors duration-200"
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
                className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-sm border-[1.5px] border-foreground text-foreground"
              >
                <Menu size={16} strokeWidth={2} />
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
                      className="inline-flex w-full items-center justify-center bg-primary text-primary-foreground rounded-sm px-5 py-3 text-sm font-semibold hover:bg-primary/90"
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
