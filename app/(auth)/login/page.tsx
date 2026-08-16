import type { Metadata } from "next";
import { LoginView } from "./_components/LoginView";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your Play Padel account to book and manage courts.",
};

export default function LoginPage() {
  return <LoginView />;
}
