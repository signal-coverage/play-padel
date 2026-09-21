// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import messages from "@/messages/es.json";
import { OnboardingWizard } from "./OnboardingWizard";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function renderWizard(signOut: () => Promise<void> = vi.fn()) {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: "user_1",
      email: "new@example.com",
      displayName: "New User",
      imageUrl: null,
      firstName: "New",
      lastName: "User",
      role: null,
      clubId: null,
      padelCategory: null,
      preferredSide: null,
      dominantHand: null,
      isAdmin: false,
      createdAt: null,
    },
    loading: false,
    profileLoading: false,
    signOut,
    refetchProfile: vi.fn(),
  });

  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <OnboardingWizard />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  pushMock.mockClear();
});

describe("OnboardingWizard — cancel out of the wizard", () => {
  it("shows an enabled Cancel button (not a disabled Back) on the very first step", async () => {
    renderWizard();

    expect(
      screen.queryByRole("button", { name: "Atrás" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
  });

  it("signs the user out and returns to the landing page when Cancel is clicked", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    renderWizard(signOut);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await vi.waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("shows a real (enabled once navigated) Back button again once past the first step, not Cancel", async () => {
    renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /soy jugador/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("button", { name: "Atrás" })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Cancelar" }),
    ).not.toBeInTheDocument();
  });
});
