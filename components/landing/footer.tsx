import Link from "next/link";

import { LogoMark } from "./logo-mark";

const SOCIALS = [
  { slug: "instagram", label: "Instagram", href: "https://instagram.com/rebote.padel" },
  { slug: "x", label: "X", href: "https://x.com/rebotepadel" },
  { slug: "facebook", label: "Facebook", href: "https://facebook.com/rebote.padel" },
];

/**
 * Standard multi-column marketing footer (Navigation, Account, Contact,
 * Social, Copyright per the brief). Every link here resolves to a real
 * route or anchor on this page; nothing points at a placeholder "#".
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <LogoMark className="size-8" />
              <span className="text-sm font-semibold tracking-tight">
                Rebote
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-[#585858]">
              Court booking and matchmaking for padel players who actually
              show up.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.slug}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex size-8 items-center justify-center rounded-full border border-border transition-colors hover:border-[#073D6B]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://cdn.simpleicons.org/${social.slug}/585858`}
                    alt=""
                    aria-hidden="true"
                    width={14}
                    height={14}
                  />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Navigation</h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-[#585858]">
              <li>
                <a href="#why-choose" className="hover:text-foreground">
                  Why Rebote
                </a>
              </li>
              <li>
                <a href="#experiences" className="hover:text-foreground">
                  Experiences
                </a>
              </li>
              <li>
                <a href="#testimonials" className="hover:text-foreground">
                  Players
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Account</h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-[#585858]">
              <li>
                <Link href="/sign-in" className="hover:text-foreground">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="hover:text-foreground">
                  Join now
                </Link>
              </li>
              <li>
                <Link href="/clubs" className="hover:text-foreground">
                  Browse clubs
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Support</h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-[#585858]">
              <li>
                <a
                  href="mailto:hello@rebote.app"
                  className="hover:text-foreground"
                >
                  hello@rebote.app
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-sm text-[#585858]">
          © 2026 Rebote. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
