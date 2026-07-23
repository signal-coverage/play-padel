import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "./prisma";

/**
 * Verifies an authenticated Clerk session exists, redirecting to `/sign-in`
 * otherwise. `cache()`-wrapped so a single request only calls `auth()` once
 * regardless of how many DAL helpers or components need the session.
 */
export const verifySession = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return { userId };
});

/**
 * Reads (or lazily creates) the local `User` row for the current Clerk
 * session. Webhook delivery is async, so the first authenticated request
 * that needs a row upserts a stub keyed to the Clerk user ID instead of
 * assuming `user.created` already ran.
 */
export const getOrCreateAppUser = cache(async () => {
  const { userId } = await verifySession();

  return prisma.user.upsert({
    where: { clerkUserId: userId },
    create: { clerkUserId: userId },
    update: {},
  });
});

/**
 * Reads the current user's primary email verification status live from
 * Clerk (not mirrored locally) so it can never go stale.
 */
export const isEmailVerified = cache(async () => {
  const user = await currentUser();

  if (!user) {
    return false;
  }

  const primaryEmail = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId
  );

  return primaryEmail?.verification?.status === "verified";
});
