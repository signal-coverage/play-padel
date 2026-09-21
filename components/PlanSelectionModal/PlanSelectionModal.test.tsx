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
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";

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

// jsdom doesn't implement EventSource. useMembershipSubscription (this
// modal's own useMembershipSubscription call, while awaiting confirmation)
// opens one — deliberately thin, just enough to let it construct/tear down
// without throwing. None of this file's tests assert on real-time push
// behavior itself (see hooks.test.tsx for that); this only keeps the
// existing polling-based tests below from crashing on mount.
class MockEventSource {
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

function renderModal(
  fetchImpl: (url: string, init?: RequestInit) => Promise<unknown>,
) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("EventSource", MockEventSource);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <PlanSelectionModal open onOpenChange={vi.fn()} />
      </QueryClientProvider>
    </NextIntlClientProvider>,
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
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

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

    expect(await screen.findByText("Membresía activa")).toBeInTheDocument();
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

    expect(await screen.findByText(/no pudimos cargar/i)).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@club.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

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
    expect(
      await screen.findByText("Prueba gratuita activa"),
    ).toBeInTheDocument();
    // Regression: the checkout drawer's own "awaiting confirmation" view
    // must hand off to the confirmed panel once the server snapshot says
    // so, same as the Dialog step already does — otherwise the Sheet stays
    // open forever on top of it (`isDrawerFlow` only ever checked
    // `localStep`/`billingCycle`, never `isConfirmed`), stuck polling with
    // no way out short of a manual close.
    expect(screen.queryByText(/confirmando tu pago/i)).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@club.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

    fireEvent.click(
      await screen.findByRole("button", { name: "Simulate brick error" }),
    );

    expect(screen.queryByText("invalid card number")).not.toBeInTheDocument();
  });

  // ANNUAL now goes through the exact same in-app card-collection drawer
  // MONTHLY does (see route.ts and MembershipCheckoutDrawer's own `cycle`
  // prop) — no more Checkout Pro tab, no more "Pay Now". This mirrors the
  // MONTHLY flow test above almost exactly, just asserting `cycle: "ANNUAL"`
  // in the POST body and that no tab is ever opened.
  it("completes the ANNUAL flow: select plan, enter card, then shows the trial-active panel — no payment tab involved", async () => {
    const windowOpenSpy = vi.spyOn(window, "open");

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
      if (url === "/api/clubs/membership" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            subscription: {
              ...PENDING_SUBSCRIPTION,
              cycle: "ANNUAL",
              status: "TRIALING",
            },
            mpPreapprovalId: "preapproval_annual_1",
          }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByRole("radio", { name: /BASIC/ });
    fireEvent.click(screen.getByRole("button", { name: "Anual" }));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@club.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

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
      cycle: "ANNUAL",
      renewalMode: "AUTO",
      payerEmail: "owner@club.com",
      cardTokenId: "tok_test",
    });

    expect(
      await screen.findByText("Prueba gratuita activa"),
    ).toBeInTheDocument();
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  // Both cycles can reach a real "authorized, no trial configured" outcome
  // (`attachPendingPreapproval` — status stays PENDING, per spec's
  // "Webhook-Only State Confirmation") — the drawer must show the
  // awaiting-confirmation view and only ever hand off to the confirmed panel
  // once the server snapshot itself says so, via a manual refresh.
  it("shows the awaiting-confirmation view after a no-trial checkout, and reveals the confirmed panel only once a refresh reports ACTIVE", async () => {
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
            subscription: { ...PENDING_SUBSCRIPTION, cycle: "ANNUAL" },
            mpPreapprovalId: "preapproval_annual_2",
          }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByRole("radio", { name: /BASIC/ });
    fireEvent.click(screen.getByRole("button", { name: "Anual" }));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@club.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verificar/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Simulate submit" }),
    );

    await screen.findByText(/confirmando tu pago/i);

    // Still pending after a manual refresh — stays on awaiting-confirmation.
    fireEvent.click(
      screen.getByRole("button", { name: /volver a comprobar/i }),
    );
    await waitFor(() => {
      expect(screen.getByText(/confirmando tu pago/i)).toBeInTheDocument();
    });

    // Webhook confirms server-side; the next manual refresh reveals it.
    subscriptionStatus = "ACTIVE";
    fireEvent.click(
      screen.getByRole("button", { name: /volver a comprobar/i }),
    );

    expect(await screen.findByText("Membresía activa")).toBeInTheDocument();
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

    expect(
      await screen.findByText("Prueba gratuita activa"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar plan" }));

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
    expect(screen.getByText("Prueba gratuita activa")).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();

    // Reopening Change Plan reflects the newly-applied plan as checked,
    // proving the confirmed subscription's plan actually updated.
    fireEvent.click(screen.getByRole("button", { name: "Cambiar plan" }));
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
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@club.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

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
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@club.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

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
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    fireEvent.change(await screen.findByLabelText(/email/i), {
      target: { value: "owner@club.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verificar/i }));

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
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /atrás/i }));

    expect(
      await screen.findByRole("radio", { name: /BASIC/ }),
    ).toBeInTheDocument();
  });
});
