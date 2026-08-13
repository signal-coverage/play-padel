import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import heroImage from "@/assets/images/paddle-tennis-field-with-balls-basket.jpg";
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
    <section
      className={cn(
        "animate-fade-up relative h-72 w-full overflow-hidden rounded-sm sm:h-80 lg:h-64",
        className,
      )}
    >
      <Image
        src={heroImage}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-t from-surface/90 via-surface/45 to-surface/10" />
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
        <div className="max-w-2xl">
          <h2 className="mb-2 text-balance font-heading text-3xl font-bold text-white sm:text-4xl">
            {heading}
          </h2>
          {subheading && (
            <p className="mb-4 max-w-md text-sm text-white/80">{subheading}</p>
          )}
          {children && (
            <div className="mb-6 flex flex-wrap gap-2">{children}</div>
          )}
          {ctaLabel && (
            <Link
              href={href}
              className="inline-flex w-fit items-center gap-2 rounded-sm bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95"
            >
              {ctaLabel}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
