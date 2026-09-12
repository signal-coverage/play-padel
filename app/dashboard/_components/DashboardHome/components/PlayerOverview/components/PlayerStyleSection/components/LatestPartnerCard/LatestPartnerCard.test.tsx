// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LatestPartnerCard } from "./LatestPartnerCard";
import type { PartnerSummary } from "../../../../types";

afterEach(cleanup);

const PARTNER: PartnerSummary = {
  id: "partner_1",
  name: "Sofía Martínez",
  avatarUrl: null,
  timesPlayedTogether: 5,
  lastPlayedLabel: "3 days ago",
  padelCategory: 3,
  preferredSide: "backhand",
  dominantHand: "right",
  email: "sofia@example.com",
  phone: null,
};

describe("LatestPartnerCard", () => {
  it("renders an empty state and no clickable card when partner is null", () => {
    render(<LatestPartnerCard partner={null} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/no partners yet/i)).toBeInTheDocument();
  });

  it("renders the partner's name and times played together", () => {
    render(<LatestPartnerCard partner={PARTNER} />);

    expect(screen.getByText("Sofía Martínez")).toBeInTheDocument();
    expect(screen.getByText(/played 5x/i)).toBeInTheDocument();
  });

  it("omits the win-rate prefix when coupleWinRate is not set (no match data yet)", () => {
    render(<LatestPartnerCard partner={PARTNER} />);

    expect(screen.queryByText(/% WR/)).not.toBeInTheDocument();
  });

  it("shows the win-rate prefix when coupleWinRate is set", () => {
    render(<LatestPartnerCard partner={{ ...PARTNER, coupleWinRate: 80 }} />);

    expect(screen.getByText(/80% WR/)).toBeInTheDocument();
  });

  it("opens the profile dialog with the real partner data on click", () => {
    render(<LatestPartnerCard partner={PARTNER} />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("sofia@example.com")).toBeInTheDocument();
  });
});
