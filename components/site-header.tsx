"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

/**
 * Global Clerk auth chrome for every authenticated-app screen. Hidden on
 * the public marketing landing page (`/`), which ships its own full-bleed
 * nav (`components/landing/nav.tsx`) and must not show a second,
 * conflicting header bar on top of an immersive hero.
 */
export function SiteHeader() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <header className="flex items-center justify-end gap-3 border-b border-border px-6 py-3">
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </header>
  );
}
