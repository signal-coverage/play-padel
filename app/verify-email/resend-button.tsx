"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ResendButton() {
  const { user } = useUser();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleResend() {
    if (!user?.primaryEmailAddress) {
      return;
    }

    setStatus("sending");

    try {
      await user.primaryEmailAddress.prepareVerification({
        strategy: "email_link",
        redirectUrl: `${window.location.origin}/verify-email`,
      });
      setStatus("sent");
    } catch (error) {
      console.error("Failed to resend verification email", error);
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        onClick={handleResend}
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending..." : "Resend verification email"}
      </Button>
      {status === "sent" ? (
        <p className="text-sm text-muted-foreground">
          Email sent — check your inbox.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="text-sm text-destructive">
          Could not send the email. Please try again.
        </p>
      ) : null}
    </div>
  );
}
