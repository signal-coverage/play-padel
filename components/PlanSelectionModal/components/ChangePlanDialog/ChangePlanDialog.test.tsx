// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ChangePlanDialog } from "./ChangePlanDialog";

afterEach(() => {
  cleanup();
});

function renderDialog(
  overrides: Partial<Parameters<typeof ChangePlanDialog>[0]> = {},
) {
  const props = {
    open: true,
    selectedPlan: "BASIC" as const,
    billingCycle: "monthly" as const,
    onOpenChange: vi.fn(),
    onSelectPlan: vi.fn(),
    ...overrides,
  };
  render(<ChangePlanDialog {...props} />);
  return props;
}

describe("ChangePlanDialog", () => {
  it("renders every plan as a radio with the current plan checked", () => {
    renderDialog({ selectedPlan: "PRO" });

    expect(screen.getByRole("radio", { name: /PRO/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: /BASIC/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("does not render anything when closed", () => {
    renderDialog({ open: false });

    expect(
      screen.queryByRole("radio", { name: /BASIC/ }),
    ).not.toBeInTheDocument();
  });

  it("picks the clicked plan and closes the dialog in one action", () => {
    const props = renderDialog({ selectedPlan: "BASIC" });

    fireEvent.click(screen.getByRole("radio", { name: /PRO/ }));

    expect(props.onSelectPlan).toHaveBeenCalledWith("PRO");
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});
