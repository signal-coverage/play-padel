"use client";

import Link from "next/link";
import { useState } from "react";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { LogoMark } from "./logo-mark";

const LINKS = [
  { href: "#why-choose", label: "Why Rebote" },
  { href: "#experiences", label: "Experiences" },
  { href: "#testimonials", label: "Players" },
];

/**
 * Sticky, single-line marketing nav (design-taste-frontend Section 4.7:
 * nav height capped, no wrap at desktop). Mobile collapses into a Sheet.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#073D6B]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="size-8" />
          <span className="text-sm font-semibold tracking-tight text-white">
            Rebote
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-white/80 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Button
            render={<Link href="/sign-up" />}
            nativeButton={false}
            className="rounded-full bg-[#DFFD36] px-5 text-black hover:bg-[#DFFD36]/85"
          >
            Join Now
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="text-white hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </Button>
          <SheetContent side="right" className="w-full sm:max-w-xs">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <LogoMark className="size-7" />
                Rebote
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-2 p-4">
              <Button
                variant="outline"
                render={<Link href="/sign-in" />}
                nativeButton={false}
                className="rounded-full"
              >
                Sign in
              </Button>
              <Button
                render={<Link href="/sign-up" />}
                nativeButton={false}
                className="rounded-full bg-[#DFFD36] text-black hover:bg-[#DFFD36]/85"
              >
                Join Now
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
