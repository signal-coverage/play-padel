import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";

export default async function OdontologyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  if (!profile) redirect("/dashboard");

  const plugin = await prisma.pluginRegistry.findUnique({
    where: {
      organizationId_pluginId: {
        organizationId: profile.organizationId,
        pluginId: "odontology",
      },
    },
    select: { enabled: true },
  });

  if (!plugin?.enabled) redirect("/dashboard");

  return <>{children}</>;
}
