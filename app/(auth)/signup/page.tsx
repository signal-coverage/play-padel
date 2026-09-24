import type { Metadata } from "next";
import { SignupView } from "./_components/SignupView";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create a Play Padel account to book courts as a player or manage your club.",
  // See app/(auth)/login/page.tsx — same reasoning: no organic-search value,
  // and it was inheriting the homepage's canonical while serving unrelated
  // content.
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return <SignupView />;
}
