// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// next/image's default loader calls out to Next's build-time image
// optimization config, which doesn't exist under Vitest — swap it for a
// plain <img> so components using it are still renderable in tests.
vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

import { MercadoPagoConnectionCard } from "./MercadoPagoConnectionCard";
import type { MercadoPagoOperationalStatus } from "./types";

function renderCard(
  status: MercadoPagoOperationalStatus,
  disconnectResponse: { ok: boolean } = { ok: true },
) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/clubs/mercadopago/operational-status") {
      return Promise.resolve({ ok: true, json: async () => status });
    }
    if (
      url === "/api/clubs/mercadopago/disconnect" &&
      init?.method === "POST"
    ) {
      return Promise.resolve({
        ok: disconnectResponse.ok,
        json: async () => ({ ok: disconnectResponse.ok }),
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MercadoPagoConnectionCard />
    </QueryClientProvider>,
  );

  return { fetchMock, queryClient };
}

describe("MercadoPagoConnectionCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Minimal, repo-established idiom (see PaymentActivationScreen.test.tsx)
    // for asserting a window.location.href navigation without actually
    // navigating jsdom.
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    // This repo's vitest.config.mts does not enable `test.globals`, so
    // @testing-library/react's automatic afterEach(cleanup) registration
    // never fires — clean up the DOM explicitly between tests instead.
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a single Connect button and no Unlink button when MP_NOT_CONNECTED", async () => {
    renderCard({ operational: false, cause: "MP_NOT_CONNECTED" });

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Connect Mercado Pago" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Unlink" }),
    ).not.toBeInTheDocument();
  });

  it("shows Switch account and Unlink buttons when connected", async () => {
    renderCard({ operational: true, cause: null });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Switch account" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Unlink" })).toBeInTheDocument();
  });

  it("shows the connected account's nickname and email when connected", async () => {
    renderCard({
      operational: true,
      cause: null,
      email: "owner@club.com",
      nickname: "clubowner",
    });

    await waitFor(() =>
      expect(
        screen.getByText("Account: clubowner (owner@club.com)"),
      ).toBeInTheDocument(),
    );
  });

  it("shows Switch account and Unlink buttons when CLUB_INACTIVE", async () => {
    renderCard({ operational: false, cause: "CLUB_INACTIVE" });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Switch account" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Unlink" })).toBeInTheDocument();
  });

  it("opens a confirmation dialog before disconnecting, and does not call the disconnect route on cancel", async () => {
    const { fetchMock } = renderCard({ operational: true, cause: null });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Unlink" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Unlink" }));

    const dialogHeading = await screen.findByRole("heading", {
      name: "Unlink Mercado Pago?",
    });
    expect(dialogHeading).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Keep connected" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Unlink Mercado Pago?" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === "POST",
      ),
    ).toBe(false);
  });

  it("calls the disconnect route and refetches operational status after confirming", async () => {
    const { fetchMock } = renderCard({ operational: true, cause: null });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Unlink" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Unlink" }));

    await screen.findByRole("heading", { name: "Unlink Mercado Pago?" });
    fireEvent.click(screen.getByRole("button", { name: "Unlink" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "/api/clubs/mercadopago/disconnect" &&
            (init as RequestInit | undefined)?.method === "POST",
        ),
      ).toBe(true);
    });

    // The operational-status endpoint is fetched again after the mutation
    // succeeds (query invalidation) — at least twice: once on mount, once
    // after the disconnect mutation's onSuccess invalidation.
    await waitFor(() => {
      const statusCalls = fetchMock.mock.calls.filter(
        ([url]) => url === "/api/clubs/mercadopago/operational-status",
      );
      expect(statusCalls.length).toBeGreaterThanOrEqual(2);
    });

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Unlink Mercado Pago?" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("opens a confirmation dialog before switching accounts, and does not navigate on cancel", async () => {
    renderCard({ operational: true, cause: null });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Switch account" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Switch account" }));

    const dialogHeading = await screen.findByRole("heading", {
      name: "Switch Mercado Pago account?",
    });
    expect(dialogHeading).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Switch Mercado Pago account?" }),
      ).not.toBeInTheDocument(),
    );
    expect(window.location.href).toBe("");
  });

  it("navigates to the connect URL after confirming the account switch", async () => {
    renderCard({ operational: true, cause: null });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Switch account" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Switch account" }));

    await screen.findByRole("heading", {
      name: "Switch Mercado Pago account?",
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(window.location.href).toBe("/api/clubs/mercadopago/connect"),
    );
  });
});
