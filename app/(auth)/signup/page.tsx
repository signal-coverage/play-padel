import type { Metadata } from "next";
import { SignupView } from "./_components/SignupView";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create a Play Padel account to book courts as a player or manage your club.",
};

export default function SignupPage() {
  return <SignupView />;
}
