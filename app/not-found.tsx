"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LogoBadge } from "@/components/LogoBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ease } from "@/lib/consts";
import notFoundImage from "@/assets/images/404.jpg";

const SUPPORT_EMAIL = "hello@playpadel.com";

export default function NotFound() {
  const shouldReduce = useReducedMotion();
  const { user, loading } = useAuth();
  const isSignedIn = !loading && !!user;

  return (
    <div className="relative isolate flex min-h-dvh items-center overflow-hidden">
      <Image
        src={notFoundImage}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-right"
      />
      {/* Light navy wash so the photo reads as part of the palette. */}
      <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
      {/* Shadow only, not a flat panel: fades from the page background down to
        a light tint that still lets the photo read through. Mobile keeps a
        wider, stronger fade since the text column spans nearly the full
        width there; desktop opens up sooner to reveal more of the photo. */}
      <div className="absolute inset-0 bg-linear-to-r from-background from-20% via-background/75 via-80% to-background/35 lg:from-10% lg:via-background/55 lg:via-50% lg:to-background/10" />

      <motion.div
        className="relative z-10 w-full max-w-lg px-6 py-12 sm:px-12 lg:px-20"
        initial={shouldReduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <div className="flex items-center gap-3">
          <LogoBadge size="md" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            Play Padel
          </span>
        </div>

        <p className="mt-10 text-[clamp(64px,9vw,120px)] leading-none font-extrabold tracking-[-0.03em] text-primary">
          404
        </p>
        <h1 className="mt-3 text-[clamp(26px,3.5vw,36px)] font-bold tracking-[-0.02em] text-foreground">
          Off the court
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-[1.75] text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Need help?{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>

        <Button
          asChild
          size="lg"
          className="mt-10 w-fit gap-2 rounded-full px-6"
        >
          <Link href={isSignedIn ? "/dashboard" : "/"}>
            {isSignedIn ? "Back to dashboard" : "Back to home"}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
