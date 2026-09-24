import type { Metadata } from "next";
import { LoginView } from "./_components/LoginView";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your Play Padel account to book and manage courts.",
  // A login form has no organic-search value and, worse, was inheriting the
  // root layout's canonical (pointing at the homepage) while serving
  // entirely different content — that mismatch is why Google indexed this
  // URL as the site's representative page instead of the real landing page.
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <LoginView />;
}
