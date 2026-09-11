// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { GroupBuilder } from "./GroupBuilder";
import type { CategoryGroup, CategoryTeam } from "../../types";

afterEach(cleanup);

const TEAMS: CategoryTeam[] = [
  {
    id: "t1",
    player1DisplayName: "Alice",
    player2DisplayName: "Ana",
    status: "REGISTERED",
  },
  {
    id: "t2",
    player1DisplayName: "Bob",
    player2DisplayName: "Ben",
    status: "REGISTERED",
  },
];

function baseProps() {
  return {
    teams: TEAMS,
    groups: [] as CategoryGroup[],
    groupCount: 2,
    isLocked: false,
    onGenerateAutomatic: vi.fn(),
    isGeneratingAutomatic: false,
    onSaveManual: vi.fn(),
    isSavingManual: false,
    onLock: vi.fn(),
    isLocking: false,
  };
}

describe("GroupBuilder", () => {
  it("calls onGenerateAutomatic when clicking the automatic button", () => {
    const props = baseProps();
    render(<GroupBuilder {...props} />);

    fireEvent.click(
      screen.getByRole("button", { name: /generate groups automatically/i }),
    );

    expect(props.onGenerateAutomatic).toHaveBeenCalled();
  });

  it("disables Save groups until every team has an assignment", () => {
    const props = baseProps();
    render(<GroupBuilder {...props} />);

    const saveButton = screen.getByRole("button", { name: /save groups/i });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/group for alice \/ ana/i), {
      target: { value: "Group A" },
    });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/group for bob \/ ben/i), {
      target: { value: "Group B" },
    });
    expect(saveButton).not.toBeDisabled();
  });

  it("calls onSaveManual with teams grouped by their selected group name", () => {
    const props = baseProps();
    render(<GroupBuilder {...props} />);

    fireEvent.change(screen.getByLabelText(/group for alice \/ ana/i), {
      target: { value: "Group A" },
    });
    fireEvent.change(screen.getByLabelText(/group for bob \/ ben/i), {
      target: { value: "Group A" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save groups/i }));

    expect(props.onSaveManual).toHaveBeenCalledWith([
      { groupName: "Group A", teamIds: ["t1", "t2"] },
    ]);
  });

  it("shows existing groups (with team names) and a Lock groups button instead of the builder once groups exist", () => {
    const props = baseProps();
    props.groups = [
      { id: "group_1", name: "Group A", position: 0, teamIds: ["t1", "t2"] },
    ];
    render(<GroupBuilder {...props} />);

    expect(screen.getByText("Group A")).toBeInTheDocument();
    expect(screen.getByText("Alice / Ana")).toBeInTheDocument();
    expect(screen.getByText("Bob / Ben")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /generate groups automatically/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /lock groups/i }));
    expect(props.onLock).toHaveBeenCalled();
  });

  it("disables the lock button once already locked", () => {
    const props = baseProps();
    props.groups = [
      { id: "group_1", name: "Group A", position: 0, teamIds: ["t1"] },
    ];
    props.isLocked = true;
    render(<GroupBuilder {...props} />);

    expect(
      screen.getByRole("button", { name: /groups locked/i }),
    ).toBeDisabled();
  });
});
