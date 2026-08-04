import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import heroImage from "@/assets/images/woman-playing-paddle-tennis-side-view.jpg";
import type { HeroShellProps } from "./types";

export function HeroShell({
  className,
  href,
  heading,
  subheading,
  ctaLabel,
  children,
}: HeroShellProps) {
  return (
    <div
      className={cn(
        "relative min-h-36 overflow-hidden rounded-2xl border border-primary-foreground/30",
        className,
      )}
    >
      <Image
        src={heroImage}
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-primary/80" />
      <div className="relative flex h-full flex-col justify-between gap-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="max-w-50 text-lg font-semibold text-primary-foreground">
              {heading}
            </h2>
            {subheading && (
              <p className="mt-1 max-w-50 text-xs text-primary-foreground/80">
                {subheading}
              </p>
            )}
          </div>
          <Link
            href={href}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-foreground"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {children && (
          <div className="flex flex-wrap items-center gap-1.5">{children}</div>
        )}

        {ctaLabel && (
          <Link
            href={href}
            className="inline-flex w-fit items-center justify-center rounded-full bg-background px-3 py-1.5 text-sm font-medium text-foreground"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
