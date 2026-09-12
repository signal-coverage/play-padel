import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import * as React from "react";
import { BankTransferHoldExpired } from "./BankTransferHoldExpired";

describe("BankTransferHoldExpired", () => {
  it("renders the player's name, court name, and a prompt to rebook", async () => {
    const html = await render(
      React.createElement(BankTransferHoldExpired, {
        userName: "Nico Sanchez",
        courtName: "Court test 1",
        scheduledStart: new Date("2026-09-15T21:00:00Z"),
      }),
    );
    expect(html).toContain("Nico Sanchez");
    expect(html).toContain("Court test 1");
    expect(html.toLowerCase()).toContain("book again");
  });
});
