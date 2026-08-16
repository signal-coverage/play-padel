"use client";

import { SignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { clerkAppearance } from "@/app/(auth)/_components/clerk-appearance";

export function LoginView() {
  return (
    <motion.div
      className="w-full"
      style={{ maxWidth: "360px" }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Welcome back!
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Sign in to your account to continue.
        </p>
      </div>

      <SignIn
        routing="hash"
        signUpUrl="/signup"
        fallbackRedirectUrl="/dashboard"
        appearance={clerkAppearance}
      />
    </motion.div>
  );
}
