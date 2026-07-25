"use client";

import { SignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { clerkAppearance } from "@/app/(auth)/_components/clerk-appearance";

const signUpAppearance = {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    card: "!pt-3",
  },
};

export default function SignupPage() {
  return (
    <motion.div
      className="w-full"
      style={{ maxWidth: "360px" }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="mb-4 text-center">
        <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Get started with ERPFlow today.
        </p>
      </div>

      <SignUp
        routing="hash"
        signInUrl="/login"
        fallbackRedirectUrl="/dashboard"
        appearance={signUpAppearance}
      />
    </motion.div>
  );
}
