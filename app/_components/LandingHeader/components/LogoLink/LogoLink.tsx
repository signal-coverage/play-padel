"use client";
import type { MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";

// The header's own smooth-scroll-to-top-on-click behavior — real
// interactivity (not decorative), so it needs its own client boundary
// separate from the server-rendered header shell around it.
export function LogoLink() {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Link href="/" onClick={handleClick} className="flex items-center gap-1.5">
      <Image src="/light/logo.svg" alt="Play Padel" width={17} height={17} />
      <span className="font-bold text-sm tracking-tight text-foreground">
        Play Padel
      </span>
    </Link>
  );
}
