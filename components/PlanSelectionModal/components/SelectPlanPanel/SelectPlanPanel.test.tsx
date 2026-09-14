// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SelectPlanPanel } from "./SelectPlanPanel";

afterEach(() => {
  cleanup();
});

function renderPanel(
  overrides: Partial<Parameters<typeof SelectPlanPanel>[0]> = {},
) {
  const props = {
    selectedPlan: "BASIC" as const,
    billingCycle: "monthly" as const,
    renewalMode: "AUTO" as const,
    errorMessage: null,
    isSubmitting: false,
    onBillingCycleChange: vi.fn(),
    onRenewalModeChange: vi.fn(),
    onChangePlan: vi.fn(),
    onContinue: vi.fn(),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SelectPlanPanel {...props} />
    </NextIntlClientProvider>,
  );
  return props;
}

describe("SelectPlanPanel", () => {
  it("shows a single card for the selected plan, with a Change Plan action", () => {
    renderPanel({ selectedPlan: "PRO" });

    expect(screen.getByRole("radio", { name: /PRO/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      screen.getByRole("button", { name: /change plan/i }),
    ).toBeInTheDocument();
  });

  it("calls onChangePlan when Change Plan is clicked", () => {
    const props = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /change plan/i }));

    expect(props.onChangePlan).toHaveBeenCalled();
  });

  it("renders nothing when there is no selected plan yet", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SelectPlanPanel
          selectedPlan={null}
          billingCycle="monthly"
          renewalMode="AUTO"
          errorMessage={null}
          isSubmitting={false}
          onBillingCycleChange={vi.fn()}
          onRenewalModeChange={vi.fn()}
          onChangePlan={vi.fn()}
          onContinue={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the renewal-mode toggle for both monthly and annual billing", () => {
    const { rerender } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SelectPlanPanel
          selectedPlan="BASIC"
          billingCycle="monthly"
          renewalMode="AUTO"
          errorMessage={null}
          isSubmitting={false}
          onBillingCycleChange={vi.fn()}
          onRenewalModeChange={vi.fn()}
          onChangePlan={vi.fn()}
          onContinue={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("radiogroup", { name: /renewal mode/i }),
    ).toBeInTheDocument();

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SelectPlanPanel
          selectedPlan="BASIC"
          billingCycle="annual"
          renewalMode="AUTO"
          errorMessage={null}
          isSubmitting={false}
          onBillingCycleChange={vi.fn()}
          onRenewalModeChange={vi.fn()}
          onChangePlan={vi.fn()}
          onContinue={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("radiogroup", { name: /renewal mode/i }),
    ).toBeInTheDocument();
  });

  it("disables Continue and shows a contact-us note when MAX is selected", () => {
    renderPanel({ selectedPlan: "MAX" });

    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    expect(screen.getByText(/contact us/i)).toBeInTheDocument();
  });

  it("calls onContinue when the Continue button is clicked for an automated plan", () => {
    const props = renderPanel({ selectedPlan: "BASIC" });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(props.onContinue).toHaveBeenCalled();
  });

  it("shows the error message when provided", () => {
    renderPanel({ errorMessage: "Something went wrong" });

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("disables Continue while submitting", () => {
    renderPanel({ isSubmitting: true });

    expect(
      screen.getByRole("button", { name: /continue|starting checkout/i }),
    ).toBeDisabled();
  });
});
