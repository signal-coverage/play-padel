// @vitest-environment jsdom
//
// Regression coverage for the "More collapses on desktop and never expands
// back, even on a huge resize back up" bug: nav-overflow-container's own
// flex-1 (inside NavLinks) only has real, viewport-stable space to claim if
// EVERYTHING between it and <header> is also properly stretched — otherwise,
// once any item collapses into "More", the row's rendered width just
// shrinks to match its own (now smaller) content, and never grows back
// regardless of how wide the actual viewport gets (jsdom can't compute real
// flex layout to catch this directly, so this asserts the load-bearing
// classNames instead — see NavLinks.test.tsx / MobileBottomNav.test.tsx for
// the same real-measured-width integration tests this bug's arithmetic
// itself already has correct coverage for).
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AppNavbar } from "./AppNavbar";
import { useAuth } from "@/hooks/use-auth";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} />
  ),
}));

// This file only cares about AppNavbar's own layout classes — every child
// component here has its own dedicated test file for its own behavior.
vi.mock("./components/NavLinks", () => ({
  NavLinks: ({ className }: { className?: string }) => (
    <nav data-testid="nav-links-stub" className={className} />
  ),
}));

vi.mock("./components/NotificationsBell", () => ({
  NotificationsBell: () => <button type="button">Notifications</button>,
}));

vi.mock("./components/UserMenu", () => ({
  UserMenu: () => <button type="button">User menu</button>,
}));

vi.mock("../CommandPalette", () => ({
  CommandPalette: () => null,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Toggle theme</button>,
}));

describe("AppNavbar layout", () => {
  it("stretches the logo+nav group and NavLinks itself to fill the header, so NavLinks' own internal flex-1 overflow container has real, viewport-stable space to claim", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "user_1",
        email: "owner@example.com",
        displayName: "Owner",
        imageUrl: null,
        firstName: "Owner",
        lastName: null,
        role: "owner",
        clubId: "club_1",
        padelCategory: null,
        preferredSide: null,
        dominantHand: null,
        isAdmin: false,
        createdAt: null,
      },
      loading: false,
      profileLoading: false,
      signOut: vi.fn(),
      refetchProfile: vi.fn(),
    });

    render(<AppNavbar />);

    // Without flex-1 here, this div sizes to its own content (Logo + nav)
    // instead of the header's true available space — the exact "shrinks to
    // its own collapsed content and never grows back" trap this test
    // guards against.
    const logoAndNavGroup = screen
      .getByRole("link", { name: /play padel/i })
      .closest("div");
    expect(logoAndNavGroup?.className).toMatch(/\bflex-1\b/);

    // Same reasoning one level down: NavLinks' own <nav> must ALSO be
    // flex-1, not just its parent, or NavLinks' internal
    // nav-overflow-container (see NavLinks.tsx/hooks.ts) still has nothing
    // real to claim.
    const navLinksStub = screen.getByTestId("nav-links-stub");
    expect(navLinksStub.className).toMatch(/\bflex-1\b/);
  });
});
