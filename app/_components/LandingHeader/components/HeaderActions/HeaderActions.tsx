"use client";
import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
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
import type { HeaderActionsProps } from "./types";

// Everything in the header's right-hand cluster is either auth-aware
// (useAuth is a client-only hook) or stateful (the mobile Sheet's open
// state) — both the CTA buttons and the mobile menu toggle live in this
// one client island so the rest of LandingHeader (logo aside) stays a
// plain server-rendered shell.
export function HeaderActions({ nav }: HeaderActionsProps) {
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

  return (
    <div className="flex items-center justify-self-end gap-2 sm:gap-3">
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
            {nav.map((link) => (
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
    </div>
  );
}
