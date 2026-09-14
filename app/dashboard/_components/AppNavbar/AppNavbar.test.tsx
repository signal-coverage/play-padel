// @vitest-environment jsdom
//
// Regression coverage for the "More collapses on desktop and never expands
// back, even on a huge resize back up" bug: nav-overflow-container's own
// flex-1 (inside NavLinks) only has real, viewport-stable space to claim if
// its whole chain up to <header> is also properly bounded — otherwise, once
// any item collapses into "More", the row's rendered width just shrinks to
// match its own (now smaller) content, and never grows back regardless of
// how wide the actual viewport gets (jsdom can't compute real flex/grid
// layout to catch this directly, so this asserts the load-bearing
// classNames instead — see NavLinks.test.tsx / MobileBottomNav.test.tsx for
// the same real-measured-width integration tests this bug's arithmetic
// itself already has correct coverage for).
//
// Also covers the "nav links must stay centered regardless of locale" fix:
// <header> is a 3-equal-column grid (grid-cols-3), not a flex
// justify-between row, specifically so NavLinks sits in a real, fixed,
// viewport-stable 1/3-width column — centered independent of how wide the
// logo or the icon cluster are, in either language.
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

vi.mock("@/components/LocaleSwitcher", () => ({
  LocaleSwitcher: () => <button type="button">Language</button>,
}));

describe("AppNavbar layout", () => {
  it("lays out the header as a 3-equal-column grid, with NavLinks alone in the centered middle column", () => {
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

    // grid-cols-3 is what actually centers the middle column regardless of
    // how wide the logo/icon-cluster columns are — a flex justify-between
    // row (the old layout) can't guarantee that.
    const header = screen.getByRole("banner");
    expect(header.className).toMatch(/\bgrid-cols-3\b/);

    // The logo now lives in its own column, separate from NavLinks (they
    // used to share one flex-1 div) — it no longer needs flex-1 itself,
    // since grid-cols-3 already bounds its column.
    const logoColumn = screen
      .getByRole("link", { name: /play padel/i })
      .closest("div");
    expect(logoColumn).not.toContainElement(
      screen.getByTestId("nav-links-stub"),
    );

    // min-w-0 on NavLinks' own column is load-bearing (not cosmetic): a
    // grid item's default min-width is its own content's intrinsic width,
    // which would let this column blow past the grid-cols-3 track's real
    // 1/3 bound instead of actually being constrained to it.
    const navLinksStub = screen.getByTestId("nav-links-stub");
    const navLinksColumn = navLinksStub.parentElement;
    expect(navLinksColumn?.className).toMatch(/\bmin-w-0\b/);

    // Same reasoning one level down as before: NavLinks' own <nav> must
    // ALSO be flex-1, or NavLinks' internal nav-overflow-container (see
    // NavLinks.tsx/hooks.ts) still has nothing real to claim — just sourced
    // from the grid track now instead of a flex-1 chain up through header.
    expect(navLinksStub.className).toMatch(/\bflex-1\b/);
  });
});
