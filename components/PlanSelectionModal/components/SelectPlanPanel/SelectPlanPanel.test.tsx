// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
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
    onSelectPlan: vi.fn(),
    onBillingCycleChange: vi.fn(),
    onRenewalModeChange: vi.fn(),
    onContinue: vi.fn(),
    ...overrides,
  };
  render(<SelectPlanPanel {...props} />);
  return props;
}

describe("SelectPlanPanel", () => {
  it("renders every plan as a radio with the selected plan checked", () => {
    renderPanel({ selectedPlan: "PRO" });

    expect(screen.getByRole("radio", { name: /PRO/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: /BASIC/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("calls onSelectPlan when a different plan card is clicked", () => {
    const props = renderPanel();

    fireEvent.click(screen.getByRole("radio", { name: /PRO/ }));

    expect(props.onSelectPlan).toHaveBeenCalledWith("PRO");
  });

  it("shows the renewal-mode toggle only for monthly billing", () => {
    const { rerender } = render(
      <SelectPlanPanel
        selectedPlan="BASIC"
        billingCycle="monthly"
        renewalMode="AUTO"
        errorMessage={null}
        isSubmitting={false}
        onSelectPlan={vi.fn()}
        onBillingCycleChange={vi.fn()}
        onRenewalModeChange={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("radiogroup", { name: /renewal mode/i }),
    ).toBeInTheDocument();

    rerender(
      <SelectPlanPanel
        selectedPlan="BASIC"
        billingCycle="annual"
        renewalMode="AUTO"
        errorMessage={null}
        isSubmitting={false}
        onSelectPlan={vi.fn()}
        onBillingCycleChange={vi.fn()}
        onRenewalModeChange={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("radiogroup", { name: /renewal mode/i }),
    ).not.toBeInTheDocument();
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
