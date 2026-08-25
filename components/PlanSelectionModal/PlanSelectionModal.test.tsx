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
import { AWAITING_CONFIRMATION_POLL_INTERVAL_MS } from "./consts";

// Same pattern as CardTokenForm.test.tsx: stand in for the real Brick so
// the full MONTHLY flow can be exercised end-to-end without mounting MP's
// real iframe-based UI.
vi.mock("@mercadopago/sdk-react", () => ({
  initMercadoPago: vi.fn(),
  CardPayment: (props: { onSubmit: (formData: unknown) => Promise<void> }) => (
    <button
      type="button"
      onClick={() =>
        props.onSubmit({
          token: "tok_test",
          issuer_id: "1",
          payment_method_id: "visa",
          transaction_amount: 30000,
          installments: 1,
          payer: { email: "owner@club.com" },
        })
      }
    >
      Simulate submit
    </button>
  ),
}));

import { PlanSelectionModal } from "./PlanSelectionModal";

const PENDING_SUBSCRIPTION = {
  id: "sub_1",
  clubId: "club_1",
  plan: "BASIC",
  pendingPlan: null,
  cycle: "MONTHLY",
  pendingCycle: null,
  renewalMode: "AUTO",
  status: "PENDING",
  currency: "ARS",
  trialEndsAt: null,
  currentPeriodEnd: null,
};

function renderModal(
  fetchImpl: (url: string, init?: RequestInit) => Promise<unknown>,
) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal("fetch", fetchMock);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <PlanSelectionModal open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );

  return fetchMock;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", "TEST-public-key");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // `vi.spyOn(window, "open")` (used by several tests below) is never
  // restored otherwise — a later test's spy would wrap the PREVIOUS test's
  // still-active spy, so a genuinely-unrelated earlier call could leak into
  // a later test's `not.toHaveBeenCalled()` assertion.
  vi.restoreAllMocks();
});

describe("PlanSelectionModal", () => {
  it("shows the plan grid once the PENDING subscription loads", async () => {
    renderModal(async (url) => {
      if (url === "/api/clubs/membership") {
        return {
          ok: true,
          json: async () => ({ subscription: PENDING_SUBSCRIPTION }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    expect(await screen.findByRole("radio", { name: /BASIC/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("shows the confirmed panel directly when the subscription is already ACTIVE", async () => {
    renderModal(async (url) => {
      if (url === "/api/clubs/membership") {
        return {
          ok: true,
          json: async () => ({
            subscription: { ...PENDING_SUBSCRIPTION, status: "ACTIVE" },
          }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    expect(await screen.findByText("Membership Active")).toBeInTheDocument();
  });

  it("shows a retry state when the subscription fetch fails", async () => {
    renderModal(async (url) => {
      if (url === "/api/clubs/membership") {
        return { ok: false, json: async () => ({ error: "boom" }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    expect(await screen.findByText(/couldn't load/i)).toBeInTheDocument();
  });

  it("completes the MONTHLY flow: select plan, enter card, then shows awaiting/confirmed", async () => {
    let subscriptionStatus = "PENDING";
    const fetchMock = renderModal(async (url, init) => {
      if (
        url === "/api/clubs/membership" &&
        (!init || init.method === undefined)
      ) {
        return {
          ok: true,
          json: async () => ({
            subscription: {
              ...PENDING_SUBSCRIPTION,
              status: subscriptionStatus,
            },
          }),
        };
      }
      if (url === "/api/clubs/membership" && init?.method === "POST") {
        subscriptionStatus = "TRIALING";
        return {
          ok: true,
          json: async () => ({
            subscription: { ...PENDING_SUBSCRIPTION, status: "TRIALING" },
            mpPreapprovalId: "preapproval_1",
          }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByRole("radio", { name: /BASIC/ });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@club.com" },
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Simulate submit" }),
    );

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });

    const [, postInit] = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "POST",
    ) as [string, RequestInit];
    expect(JSON.parse(postInit.body as string)).toEqual({
      plan: "BASIC",
      cycle: "MONTHLY",
      renewalMode: "AUTO",
      payerEmail: "owner@club.com",
      cardTokenId: "tok_test",
    });

    // Final state is TRIALING (MONTHLY's synchronous trial-start
    // confirmation, see route.ts), so the trial-specific copy shows instead
    // of the paid-confirmation copy — see ConfirmedPanel's `isTrialing`.
    expect(await screen.findByText("Free Trial Active")).toBeInTheDocument();
  });

  it("completes the ANNUAL flow: select plan, continue opens the checkout tab, then shows awaiting confirmation", async () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);

    renderModal(async (url, init) => {
      if (
        url === "/api/clubs/membership" &&
        (!init || init.method === undefined)
      ) {
        return {
          ok: true,
          json: async () => ({ subscription: PENDING_SUBSCRIPTION }),
        };
      }
      if (url === "/api/clubs/membership" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            subscription: PENDING_SUBSCRIPTION,
            checkoutUrl: "https://mercadopago.example/checkout/123",
          }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByRole("radio", { name: /BASIC/ });
    fireEvent.click(screen.getByRole("button", { name: "Annual" }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        "https://mercadopago.example/checkout/123",
        "_blank",
      );
    });

    expect(
      await screen.findByText(/confirming your payment/i),
    ).toBeInTheDocument();
  });

  // Confirmed sdd-verify gap fix: when the tier has a free trial configured,
  // ANNUAL checkout now starts an app-tracked trial (no Mercado Pago object,
  // no `checkoutUrl`) instead of always opening a payment tab — see
  // app/api/clubs/membership/route.ts's ANNUAL branch. The modal must reach
  // "Free Trial Active" directly, WITHOUT ever opening a tab or showing the
  // "awaiting confirmation" step, since `isMembershipConfirmed` already
  // treats TRIALING as confirmed the instant the checkout response lands.
  it("completes the ANNUAL trial-start flow: continue starts a trial with no payment tab, straight to the trial-active panel", async () => {
    const windowOpenSpy = vi.spyOn(window, "open");

    renderModal(async (url, init) => {
      if (
        url === "/api/clubs/membership" &&
        (!init || init.method === undefined)
      ) {
        return {
          ok: true,
          json: async () => ({ subscription: PENDING_SUBSCRIPTION }),
        };
      }
      if (url === "/api/clubs/membership" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            subscription: { ...PENDING_SUBSCRIPTION, status: "TRIALING" },
          }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByRole("radio", { name: /BASIC/ });
    fireEvent.click(screen.getByRole("button", { name: "Annual" }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText("Free Trial Active")).toBeInTheDocument();
    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/confirming your payment/i),
    ).not.toBeInTheDocument();
  });

  // sdd-verify follow-up fix: an ANNUAL trial has no way to reach ACTIVE
  // without an explicit "Pay Now" action — before this fix, the checkout
  // route always 409'd for a non-PENDING subscription, so there was no UI
  // affordance to even attempt it.
  it("shows a Pay Now button for a TRIALING ANNUAL subscription and calls the checkout route again when clicked", async () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);

    const fetchMock = renderModal(async (url, init) => {
      if (
        url === "/api/clubs/membership" &&
        (!init || init.method === undefined)
      ) {
        return {
          ok: true,
          json: async () => ({
            subscription: {
              ...PENDING_SUBSCRIPTION,
              cycle: "ANNUAL",
              status: "TRIALING",
            },
          }),
        };
      }
      if (url === "/api/clubs/membership" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            subscription: {
              ...PENDING_SUBSCRIPTION,
              cycle: "ANNUAL",
              status: "TRIALING",
            },
            checkoutUrl: "https://mercadopago.example/checkout/paynow",
          }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    fireEvent.click(await screen.findByRole("button", { name: "Pay Now" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });

    const [, postInit] = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "POST",
    ) as [string, RequestInit];
    expect(JSON.parse(postInit.body as string)).toEqual({
      plan: "BASIC",
      cycle: "ANNUAL",
    });

    await waitFor(() => {
      expect(windowOpenSpy).toHaveBeenCalledWith(
        "https://mercadopago.example/checkout/paynow",
        "_blank",
      );
    });

    // Still shows the trial-active panel — status never jumps to ACTIVE
    // client-side, only a real webhook can do that.
    expect(screen.getByText("Free Trial Active")).toBeInTheDocument();
  });

  // sdd-verify follow-up fix (post-Batch-11 UX polish): the existing
  // tab-auto-close effect watched `isConfirmed` (true for BOTH TRIALING and
  // ACTIVE, per isMembershipConfirmed). A tab opened via "Pay Now" is opened
  // while `isConfirmed` is ALREADY `true` (the subscription is TRIALING),
  // so the boolean never toggles across the later TRIALING -> ACTIVE
  // transition and the effect never re-fires — the pay-now tab was
  // orphaned. ConfirmedPanel has no manual "Check again" button, so the
  // only way the client can ever learn about the webhook-driven ACTIVE
  // transition is live polling — this test proves both the polling and the
  // resulting tab-close happen automatically.
  // Uses REAL timers deliberately: TanStack Query's `refetchInterval`
  // scheduling ultimately settles via internal microtask batching that
  // fake timers (`vi.useFakeTimers`) can't reliably drive to completion in
  // this setup — advancing the fake clock past the interval reliably
  // triggers the `fetch` call, but the resulting state update/re-render
  // never lands even after draining extra ticks. Waiting out the real
  // interval is slower but deterministic; the generous per-test/`waitFor`
  // timeouts below account for that.
  it(
    "closes the Pay Now tab once live polling picks up the ACTIVE confirmation",
    async () => {
      const fakeCheckoutWindow = { close: vi.fn() } as unknown as Window;
      const windowOpenSpy = vi
        .spyOn(window, "open")
        .mockReturnValue(fakeCheckoutWindow);

      let subscriptionStatus = "TRIALING";
      renderModal(async (url, init) => {
        if (
          url === "/api/clubs/membership" &&
          (!init || init.method === undefined)
        ) {
          return {
            ok: true,
            json: async () => ({
              subscription: {
                ...PENDING_SUBSCRIPTION,
                cycle: "ANNUAL",
                status: subscriptionStatus,
              },
            }),
          };
        }
        if (url === "/api/clubs/membership" && init?.method === "POST") {
          return {
            ok: true,
            json: async () => ({
              subscription: {
                ...PENDING_SUBSCRIPTION,
                cycle: "ANNUAL",
                status: "TRIALING",
              },
              checkoutUrl: "https://mercadopago.example/checkout/paynow",
            }),
          };
        }
        throw new Error(`unexpected fetch: ${url}`);
      });

      fireEvent.click(await screen.findByRole("button", { name: "Pay Now" }));

      await waitFor(() => {
        expect(windowOpenSpy).toHaveBeenCalledWith(
          "https://mercadopago.example/checkout/paynow",
          "_blank",
        );
      });
      expect(fakeCheckoutWindow.close).not.toHaveBeenCalled();

      // Webhook confirms server-side; the client only learns about it via
      // the next automatic poll tick, never a manual refresh (there is no
      // "Check again" button on the confirmed panel).
      subscriptionStatus = "ACTIVE";
      await waitFor(
        () => {
          expect(fakeCheckoutWindow.close).toHaveBeenCalledTimes(1);
        },
        { timeout: AWAITING_CONFIRMATION_POLL_INTERVAL_MS + 3000 },
      );
    },
    AWAITING_CONFIRMATION_POLL_INTERVAL_MS + 5000,
  );

  it(
    "updates the confirmed panel's copy from 'Free Trial Active' to 'Membership Active' once polling detects ACTIVE, without closing/reopening the modal",
    async () => {
      vi.spyOn(window, "open").mockReturnValue({
        close: vi.fn(),
      } as unknown as Window);

      let subscriptionStatus = "TRIALING";
      renderModal(async (url, init) => {
        if (
          url === "/api/clubs/membership" &&
          (!init || init.method === undefined)
        ) {
          return {
            ok: true,
            json: async () => ({
              subscription: {
                ...PENDING_SUBSCRIPTION,
                cycle: "ANNUAL",
                status: subscriptionStatus,
              },
            }),
          };
        }
        if (url === "/api/clubs/membership" && init?.method === "POST") {
          return {
            ok: true,
            json: async () => ({
              subscription: {
                ...PENDING_SUBSCRIPTION,
                cycle: "ANNUAL",
                status: "TRIALING",
              },
              checkoutUrl: "https://mercadopago.example/checkout/paynow",
            }),
          };
        }
        throw new Error(`unexpected fetch: ${url}`);
      });

      expect(await screen.findByText("Free Trial Active")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Pay Now" }));

      await waitFor(() => {
        expect(window.open).toHaveBeenCalled();
      });

      // Still the SAME rendered modal instance — no unmount/remount, no
      // close+reopen. Only the underlying query result changes once
      // polling picks up the webhook-driven ACTIVE transition.
      subscriptionStatus = "ACTIVE";
      await waitFor(
        () => {
          expect(screen.getByText("Membership Active")).toBeInTheDocument();
        },
        { timeout: AWAITING_CONFIRMATION_POLL_INTERVAL_MS + 3000 },
      );
      expect(screen.queryByText("Free Trial Active")).not.toBeInTheDocument();
    },
    AWAITING_CONFIRMATION_POLL_INTERVAL_MS + 5000,
  );

  it("does not show a Pay Now button for a TRIALING MONTHLY subscription (already has an authorized preapproval)", async () => {
    renderModal(async (url) => {
      if (url === "/api/clubs/membership") {
        return {
          ok: true,
          json: async () => ({
            subscription: {
              ...PENDING_SUBSCRIPTION,
              cycle: "MONTHLY",
              status: "TRIALING",
            },
          }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    expect(await screen.findByText("Free Trial Active")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pay Now" }),
    ).not.toBeInTheDocument();
  });

  it("closes the opened checkout tab only once confirmation arrives, never while still pending", async () => {
    const fakeCheckoutWindow = { close: vi.fn() } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(fakeCheckoutWindow);

    let subscriptionStatus = "PENDING";
    renderModal(async (url, init) => {
      if (
        url === "/api/clubs/membership" &&
        (!init || init.method === undefined)
      ) {
        return {
          ok: true,
          json: async () => ({
            subscription: {
              ...PENDING_SUBSCRIPTION,
              status: subscriptionStatus,
            },
          }),
        };
      }
      if (url === "/api/clubs/membership" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            subscription: PENDING_SUBSCRIPTION,
            checkoutUrl: "https://mercadopago.example/checkout/123",
          }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByRole("radio", { name: /BASIC/ });
    fireEvent.click(screen.getByRole("button", { name: "Annual" }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await screen.findByText(/confirming your payment/i);
    expect(fakeCheckoutWindow.close).not.toHaveBeenCalled();

    // Still pending after a manual refresh — must not close the tab yet.
    fireEvent.click(screen.getByRole("button", { name: /check again/i }));
    await waitFor(() => {
      expect(screen.getByText(/confirming your payment/i)).toBeInTheDocument();
    });
    expect(fakeCheckoutWindow.close).not.toHaveBeenCalled();

    // Webhook confirms — next refresh reveals ACTIVE, which must close the tab.
    subscriptionStatus = "ACTIVE";
    fireEvent.click(screen.getByRole("button", { name: /check again/i }));

    await waitFor(() => {
      expect(fakeCheckoutWindow.close).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("Membership Active")).toBeInTheDocument();
  });

  it("goes back from the card step to plan selection", async () => {
    renderModal(async (url) => {
      if (url === "/api/clubs/membership") {
        return {
          ok: true,
          json: async () => ({ subscription: PENDING_SUBSCRIPTION }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByRole("radio", { name: /BASIC/ });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(
      await screen.findByRole("radio", { name: /BASIC/ }),
    ).toBeInTheDocument();
  });
});
