import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("Clerk webhook signature verification failed", error);
    return new NextResponse("Webhook verification failed", { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const clerkUserId = event.data.id;

    // `update: {}` intentionally no-ops on app-owned fields (name, city,
    // phone, onboardingComplete) so a delayed/late webhook never clobbers
    // data the user already entered during onboarding.
    await prisma.user.upsert({
      where: { clerkUserId },
      create: { clerkUserId },
      update: {},
    });
  }

  return NextResponse.json({ received: true });
}
