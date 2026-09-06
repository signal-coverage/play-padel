import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin";

// Gates every current and future page under /admin/* in one place — real
// Clerk-based admin check (see lib/auth/admin.ts), replacing the old
// static-secret bearer guard the pages under here used to rely on entirely
// via their own API calls (see proxy.ts's removed "/admin/(.*)" public-route
// entry). A plain 404 for a non-admin, rather than a login redirect,
// deliberately avoids revealing that /admin is a meaningful route at all to
// someone who stumbles onto it signed in as a non-admin user.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId || !(await isAdminUser(userId))) {
    notFound();
  }
  return <>{children}</>;
}
