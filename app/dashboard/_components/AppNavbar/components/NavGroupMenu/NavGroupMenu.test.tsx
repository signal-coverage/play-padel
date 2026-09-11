// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ScrollText, Activity, Shield } from "lucide-react";
import { NavGroupMenu } from "./NavGroupMenu";
import type { VisibleNavLink } from "../../hooks";

const ITEMS: VisibleNavLink[] = [
  {
    title: "Audit Log",
    href: "/dashboard/audit-logs",
    icon: ScrollText,
    roles: ["owner", "player"],
    adminOnly: true,
    group: "admin",
    active: false,
    viaAdminWidening: false,
  },
  {
    title: "System Status",
    href: "/dashboard/admin-status",
    icon: Activity,
    roles: ["owner", "player"],
    adminOnly: true,
    group: "admin",
    active: false,
    viaAdminWidening: false,
  },
];

describe("NavGroupMenu", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the given label as a trigger and none of the grouped item titles until opened", () => {
    render(
      <NavGroupMenu items={ITEMS} active={false} label="Admin" icon={Shield} />,
    );

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
    expect(screen.queryByText("System Status")).not.toBeInTheDocument();
  });

  it("reveals every grouped item as a link to its own href once the trigger is clicked", async () => {
    render(
      <NavGroupMenu items={ITEMS} active={false} label="Admin" icon={Shield} />,
    );

    fireEvent.click(screen.getByText("Admin"));

    const auditLog = await screen.findByRole("menuitem", {
      name: "Audit Log",
    });
    expect(auditLog).toHaveAttribute("href", "/dashboard/audit-logs");

    const systemStatus = await screen.findByRole("menuitem", {
      name: "System Status",
    });
    expect(systemStatus).toHaveAttribute("href", "/dashboard/admin-status");
  });

  it("renders the mobile variant's trigger with the same accessible label", () => {
    render(
      <NavGroupMenu
        items={ITEMS}
        active={false}
        label="Admin"
        icon={Shield}
        variant="mobile"
      />,
    );

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders whatever label it's given (e.g. More), not a hardcoded one", () => {
    render(<NavGroupMenu items={ITEMS} active={false} label="More" />);

    expect(screen.getByText("More")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("closes when clicking outside the menu", () => {
    render(
      <div>
        <NavGroupMenu
          items={ITEMS}
          active={false}
          label="Admin"
          icon={Shield}
        />
        <button type="button">Elsewhere</button>
      </div>,
    );

    fireEvent.click(screen.getByText("Admin"));
    expect(
      screen.getByRole("menuitem", { name: "Audit Log" }),
    ).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText("Elsewhere"));

    expect(
      screen.queryByRole("menuitem", { name: "Audit Log" }),
    ).not.toBeInTheDocument();
  });

  it("does not close when clicking inside the menu itself", () => {
    render(
      <NavGroupMenu items={ITEMS} active={false} label="Admin" icon={Shield} />,
    );

    fireEvent.click(screen.getByText("Admin"));
    const menu = screen.getByRole("menu");
    fireEvent.mouseDown(menu);

    expect(
      screen.getByRole("menuitem", { name: "Audit Log" }),
    ).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger button", () => {
    render(
      <NavGroupMenu items={ITEMS} active={false} label="Admin" icon={Shield} />,
    );

    const trigger = screen.getByRole("button", { name: "Admin" });
    fireEvent.click(trigger);
    expect(
      screen.getByRole("menuitem", { name: "Audit Log" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("menuitem", { name: "Audit Log" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
