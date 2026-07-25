import { Webhook } from "svix";
import { prisma } from "@/infrastructure/db/client";
import type { SystemRole } from "@/core/users/types";

interface ClerkUserCreatedEvent {
  type: "user.created";
  data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email_addresses: Array<{ email_address: string; id: string }>;
    primary_email_address_id: string;
    public_metadata: {
      organizationId?: string;
      roleId?: SystemRole;
    };
  };
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 401 });
  }

  const rawBody = await request.text();

  let event: ClerkUserCreatedEvent;
  try {
    const wh = new Webhook(secret);
    const verified = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: ClerkUserCreatedEvent["data"] };

    if (verified.type !== "user.created") {
      return new Response("Event ignored", { status: 200 });
    }

    event = verified as ClerkUserCreatedEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 401 });
  }

  const {
    id,
    first_name,
    last_name,
    email_addresses,
    primary_email_address_id,
    public_metadata,
  } = event.data;

  const { organizationId, roleId } = public_metadata ?? {};

  // Non-invite signup — skip profile creation, let onboarding handle it
  if (!organizationId || !roleId) {
    return new Response("OK", { status: 200 });
  }

  const primaryEmail = email_addresses.find(
    (e) => e.id === primary_email_address_id,
  )?.email_address;

  if (!primaryEmail) {
    return new Response("No primary email found", { status: 400 });
  }

  const displayName =
    [first_name, last_name].filter(Boolean).join(" ") ||
    primaryEmail.split("@")[0];

  try {
    await prisma.userProfile.upsert({
      where: { id },
      update: {},
      create: {
        id,
        organizationId,
        roleId,
        displayName,
        email: primaryEmail,
        status: "ACTIVE",
        createdBy: "system",
        updatedBy: "system",
      },
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook DB error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
