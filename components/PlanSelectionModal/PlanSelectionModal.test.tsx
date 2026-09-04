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

// Mocked purely so the tests below can assert whether the celebration
// fired — the real module is a plain event dispatch with no DOM/canvas
// involvement at all (SuccessCelebrationPortal, which isn't mounted in
// these tests, owns actually rendering anything), so calling it for real
// here would just be a harmless no-op with no listener attached.
const { fireSuccessCelebrationMock } = vi.hoisted(() => ({
  fireSuccessCelebrationMock: vi.fn(),
}));
vi.mock("@/lib/utils/celebration", () => ({
  fireSuccessCelebration: fireSuccessCelebrationMock,
}));

// PlanSelectionModal now reads the owner's own email (to pre-fill the
// checkout drawer's email step) via useAuth — mocked directly rather than
// wrapping every test in a real <AuthProvider>, which would drag in Clerk.
const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(() => ({ user: { email: "owner@club.com" } })),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: useAuthMock,
}));

// Same pattern as CardTokenForm.test.tsx: stand in for the real Brick so
// the full MONTHLY flow can be exercised end-to-end without mounting MP's
// real iframe-based UI.
vi.mock("@mercadopago/sdk-react", () => ({
  initMercadoPago: vi.fn(),
  CardPayment: (props: {
    initialization?: {
      payer?: { identification?: { type: string; number: string } };
    };
    onSubmit: (formData: unknown) => Promise<void>;
    onError?: (param: { message?: string }) => void;
  }) => (
    <>
      <span data-testid="brick-identification">
        {props.initialization?.payer?.identification
          ? `${props.initialization.payer.identification.type}:${props.initialization.payer.identification.number}`
          : ""}
      </span>
      <button
        type="button"
        onClick={() =>
          props.onSubmit({
            token: "tok_test",
            issuer_id: "1",
            payment_method_id: "visa",
            transaction_amount: 30000,
            installments: 1,
            payer: {
              email: "owner@club.com",
              identification: props.initialization?.payer?.identification,
            },
          })
        }
      >
        Simulate submit
      </button>
      <button
        type="button"
        onClick={() => props.onError?.({ message: "invalid card number" })}
      >
        Simulate brick error
      </button>
    </>
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
  fireSuccessCelebrationMock.mockClear();
  // Re-applied every test rather than relying on afterEach's
  // `restoreAllMocks()` to preserve it — `vi.fn(impl)`'s own initial
  // implementation is exactly the kind of thing that call can clear.
  useAuthMock.mockReturnValue({ user: { email: "owner@club.com" } });
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

  it("pre-fills the checkout drawer's email step with the owner's own account email", async () => {
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

    expect(await screen.findByLabelText(/email/i)).toHaveValue(
      "owner@club.com",
    );
  });

  it("shows the confirmed panel directly when the subscription is already ACTIVE, without a celebration", async () => {
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
    // The celebration marks a payment JUST settling, not the owner merely
    // reopening a dialog that's already been ACTIVE all along.
    expect(fireSuccessCelebrationMock).not.toHaveBeenCalled();
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
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

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
    // Regression: the checkout drawer's own "awaiting confirmation" view
    // must hand off to the confirmed panel once the server snapshot says
    // so, same as the Dialog step already does — otherwise the Sheet stays
    // open forever on top of it (`isDrawerFlow` only ever checked
    // `localStep`/`billingCycle`, never `isConfirmed`), stuck polling with
    // no way out short of a manual close.
    expect(
      screen.queryByText(/confirming your payment/i),
    ).not.toBeInTheDocument();
  });

  // The Brick already renders its own error UI for its own validation
  // failures (verified live — MP shows e.g. "Something went wrong. Please
  // try again later." directly above its own "Pay" button); this app's own
  // error box next to it is reserved for OUR backend rejecting an already-
  // tokenized card (see the next test), not a second copy of what the
  // Brick itself already displayed.
  it("does not show its own error box for the Brick's own validation errors", async () => {
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
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByRole("radio", { name: /BASIC/ });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@club.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    fireEvent.click(
      await screen.findByRole("button", { name: "Simulate brick error" }),
    );

    expect(screen.queryByText("invalid card number")).not.toBeInTheDocument();
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
      // Same genuine TRIALING -> ACTIVE transition that closes the tab
      // above also celebrates it — this is the owner's actual payment
      // settling, tracked live while still on the confirmed panel.
      expect(fireSuccessCelebrationMock).toHaveBeenCalledTimes(1);
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

  // The gap this fix closes: a TRIALING owner previously had no way to
  // switch plan tier at all — ConfirmedPanel had no action for it. Since no
  // real charge has happened yet on either cycle while TRIALING, the change
  // applies IMMEDIATELY via PATCH, never through the checkout wizard.
  it("changes plan immediately for a TRIALING subscription via Change Plan, without ever showing the checkout wizard", async () => {
    let currentPlan = "BASIC";
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
              plan: currentPlan,
              status: "TRIALING",
            },
          }),
        };
      }
      if (url === "/api/clubs/membership" && init?.method === "PATCH") {
        currentPlan = "PRO";
        return {
          ok: true,
          json: async () => ({
            subscription: {
              ...PENDING_SUBSCRIPTION,
              plan: "PRO",
              status: "TRIALING",
            },
          }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    expect(await screen.findByText("Free Trial Active")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Change Plan" }));

    fireEvent.click(await screen.findByRole("radio", { name: /PRO/ }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([, init]) => init?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
    });

    const [, patchInit] = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    ) as [string, RequestInit];
    expect(JSON.parse(patchInit.body as string)).toEqual({ plan: "PRO" });

    // Never enters the checkout wizard — stays on the confirmed trial panel.
    expect(screen.getByText("Free Trial Active")).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();

    // Reopening Change Plan reflects the newly-applied plan as checked,
    // proving the confirmed subscription's plan actually updated.
    fireEvent.click(screen.getByRole("button", { name: "Change Plan" }));
    expect(await screen.findByRole("radio", { name: /PRO/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  // Confirms facts 1-4 of the identification-prefill feature: a club with a
  // known `taxId` and no previously-saved identification shows the
  // save-identification checkbox pre-checked, with the club's own CUIT
  // prefilled through to the (real, unmocked) CardTokenForm's Brick
  // initialization — and submitting with the box still checked sends both
  // `identification` and `saveIdentification: true` in the checkout POST
  // body.
  it("pre-checks the save-identification checkbox with the club's own taxId prefilled, and sends identification + saveIdentification on submit", async () => {
    const fetchMock = renderModal(async (url, init) => {
      if (
        url === "/api/clubs/membership" &&
        (!init || init.method === undefined)
      ) {
        return {
          ok: true,
          json: async () => ({ subscription: PENDING_SUBSCRIPTION }),
        };
      }
      if (url === "/api/clubs") {
        return {
          ok: true,
          json: async () => ({ club: { taxId: "30-11111111-1" } }),
        };
      }
      if (url === "/api/clubs/membership" && init?.method === "POST") {
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
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    expect(await screen.findByRole("checkbox")).toBeChecked();
    expect(await screen.findByTestId("brick-identification")).toHaveTextContent(
      "CUIT:30-11111111-1",
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Simulate submit" }),
    );

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([u, i]) => u === "/api/clubs/membership" && i?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });

    const [, postInit] = fetchMock.mock.calls.find(
      ([u, i]) => u === "/api/clubs/membership" && i?.method === "POST",
    ) as [string, RequestInit];
    expect(JSON.parse(postInit.body as string)).toEqual({
      plan: "BASIC",
      cycle: "MONTHLY",
      renewalMode: "AUTO",
      payerEmail: "owner@club.com",
      cardTokenId: "tok_test",
      identification: { type: "CUIT", number: "30-11111111-1" },
      saveIdentification: true,
    });
  });

  it("uses the subscription's own previously-saved identification instead of re-deriving from the club's taxId", async () => {
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
              payerIdentificationType: "DNI",
              payerIdentificationNumber: "12345678",
            },
          }),
        };
      }
      if (url === "/api/clubs") {
        return {
          ok: true,
          json: async () => ({ club: { taxId: "30-11111111-1" } }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByRole("radio", { name: /BASIC/ });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@club.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    expect(await screen.findByTestId("brick-identification")).toHaveTextContent(
      "DNI:12345678",
    );
  });

  it("sends no identification/saveIdentification when the save-identification checkbox is unchecked", async () => {
    const fetchMock = renderModal(async (url, init) => {
      if (
        url === "/api/clubs/membership" &&
        (!init || init.method === undefined)
      ) {
        return {
          ok: true,
          json: async () => ({ subscription: PENDING_SUBSCRIPTION }),
        };
      }
      if (url === "/api/clubs") {
        return {
          ok: true,
          json: async () => ({ club: { taxId: "30-11111111-1" } }),
        };
      }
      if (url === "/api/clubs/membership" && init?.method === "POST") {
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
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    fireEvent.click(await screen.findByRole("checkbox"));

    fireEvent.click(
      await screen.findByRole("button", { name: "Simulate submit" }),
    );

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([u, i]) => u === "/api/clubs/membership" && i?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });

    const [, postInit] = fetchMock.mock.calls.find(
      ([u, i]) => u === "/api/clubs/membership" && i?.method === "POST",
    ) as [string, RequestInit];
    const body = JSON.parse(postInit.body as string);
    expect(body.identification).toBeUndefined();
    expect(body.saveIdentification).toBeUndefined();
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
