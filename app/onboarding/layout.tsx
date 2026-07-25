import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });

  if (profile) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
