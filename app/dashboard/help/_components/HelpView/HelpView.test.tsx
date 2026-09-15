// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { HelpView } from "./HelpView";
import { useAuth } from "@/hooks/use-auth";
import type { AppUser } from "@/providers/auth-provider";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

function baseUser(overrides: Partial<AppUser>): AppUser {
  return {
    id: "user_1",
    email: "user@example.com",
    displayName: "Test User",
    imageUrl: null,
    firstName: "Test",
    lastName: "User",
    role: "player",
    clubId: null,
    padelCategory: null,
    preferredSide: null,
    dominantHand: null,
    isAdmin: false,
    createdAt: null,
    ...overrides,
  };
}

function mockAuth(overrides: Partial<AppUser>) {
  vi.mocked(useAuth).mockReturnValue({
    user: baseUser(overrides),
    loading: false,
    profileLoading: false,
    signOut: vi.fn(),
    refetchProfile: vi.fn().mockResolvedValue(undefined),
  });
}

function renderHelpView() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <HelpView />
    </NextIntlClientProvider>,
  );
}

describe("HelpView", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows the player help section and hides the owner section for a player", () => {
    mockAuth({ role: "player" });
    renderHelpView();

    expect(
      screen.getByRole("heading", { name: "For players" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "For club owners" }),
    ).not.toBeInTheDocument();
  });

  it("shows the owner help section and hides the player section for an owner", () => {
    mockAuth({ role: "owner" });
    renderHelpView();

    expect(
      screen.getByRole("heading", { name: "For club owners" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "For players" }),
    ).not.toBeInTheDocument();
  });

  it("always renders the account & language section, regardless of role", () => {
    mockAuth({ role: "player" });
    renderHelpView();

    expect(
      screen.getByRole("heading", { name: "Account & language" }),
    ).toBeInTheDocument();
  });

  it("renders the page title and description", () => {
    mockAuth({ role: "player" });
    renderHelpView();

    expect(screen.getByRole("heading", { name: "Help" })).toBeInTheDocument();
    expect(
      screen.getByText("A quick guide to getting the most out of Play Padel."),
    ).toBeInTheDocument();
  });
});
