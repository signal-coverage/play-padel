"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, RotateCw } from "lucide-react";
import { LogoBadge } from "@/components/LogoBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ease } from "@/lib/consts";

const SUPPORT_EMAIL = "hello@playpadel.com";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const shouldReduce = useReducedMotion();
  const { user, loading } = useAuth();
  const isSignedIn = !loading && !!user;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-12">
      <motion.div
        className="relative z-10 w-full max-w-lg text-center"
        initial={shouldReduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <div className="flex items-center justify-center gap-3">
          <LogoBadge size="md" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            Play Padel
          </span>
        </div>

        <h1 className="mt-10 text-[clamp(26px,3.5vw,36px)] font-bold tracking-[-0.02em] text-foreground">
          Something went wrong
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-[1.75] text-muted-foreground">
          An unexpected error occurred. You can try again, or reach out if the
          problem keeps happening.
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

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="gap-2 rounded-full px-6" onClick={reset}>
            <RotateCw className="h-4 w-4" strokeWidth={2} />
            Try again
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="gap-2 rounded-full px-6"
          >
            <Link href={isSignedIn ? "/dashboard" : "/"}>
              {isSignedIn ? "Back to dashboard" : "Back to home"}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
