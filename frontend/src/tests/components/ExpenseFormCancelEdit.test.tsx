import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpenseForm from "../../components/ExpenseForm";
import { Expense } from "../../models/Users";
import { seedUsers, seedGroups, seedExpenses } from "../utils/mockData";

// Same date-picker mocks as ExpenseForm.test.tsx: date-fns v4 is ESM and CRA's
// Jest cannot parse it.
jest.mock("@mui/x-date-pickers/AdapterDateFns", () => ({
  AdapterDateFns: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@mui/x-date-pickers", () => ({
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DatePicker: () => <input type="text" data-testid="mock-date-picker" />,
}));

// Unlike ExpenseForm.test.tsx this suite deliberately uses the real
// SplitSelector: cancelling an edit used to leave the form and the selector
// pushing state at each other forever, which only shows up when both are real.
const editedExpense = seedExpenses.find((e) => e.groupId === "g1") as Expense;

// The form scrolls itself into view when an edit starts; jsdom has no layout.
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

// Renders the form already in edit mode, and drops out of it on cancel, the
// way MainApp does.
const EditHarness: React.FC = () => {
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(
    editedExpense
  );

  return (
    <ExpenseForm
      onAddExpense={jest.fn()}
      onEditExpense={jest.fn()}
      onCancelEdit={() => setEditingExpense(null)}
      editingExpense={editingExpense}
      users={seedUsers}
      groups={seedGroups}
      selectedGroupId="g1"
      onGroupChange={jest.fn()}
    />
  );
};

const RepeatedEditHarness: React.FC = () => {
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(
    editedExpense
  );

  return (
    <>
      {!editingExpense && (
        <button onClick={() => setEditingExpense(editedExpense)}>
          Start edit
        </button>
      )}
      <ExpenseForm
        onAddExpense={jest.fn()}
        onEditExpense={jest.fn()}
        onCancelEdit={() => setEditingExpense(null)}
        editingExpense={editingExpense}
        users={seedUsers}
        groups={seedGroups}
        selectedGroupId="g1"
        onGroupChange={jest.fn()}
      />
    </>
  );
};

describe("ExpenseForm cancelling an edit", () => {
  it("empties the form instead of keeping the edited expense", async () => {
    const user = userEvent.setup();
    render(<EditHarness />);

    expect(screen.getByLabelText(/description/i)).toHaveValue(
      editedExpense.description
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("heading", { name: /Add Expense/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toHaveValue("");
    // Amount is a number input, so empty reads as null rather than "".
    expect(screen.getByLabelText(/amount/i)).toHaveValue(null);
    // The split selector must clear too, or the next expense silently inherits
    // the cancelled one's participants. With nobody selected the Equal tab is
    // disabled and loses its "(4)" count.
    expect(screen.getByRole("button", { name: "Equal" })).toBeDisabled();
  });

  it("settles instead of looping between the form and the split selector", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    try {
      render(<EditHarness />);
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      const loopWarnings = errorSpy.mock.calls.filter((args) =>
        String(args[0]).includes("Maximum update depth exceeded")
      );
      expect(loopWarnings).toHaveLength(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("stays settled across repeated edit and cancel transitions", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    try {
      render(<RepeatedEditHarness />);

      for (let cycle = 0; cycle < 3; cycle += 1) {
        expect(screen.getByLabelText(/description/i)).toHaveValue(
          editedExpense.description
        );
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(screen.getByLabelText(/description/i)).toHaveValue("");

        if (cycle < 2) {
          await user.click(screen.getByRole("button", { name: "Start edit" }));
        }
      }

      const loopWarnings = errorSpy.mock.calls.filter((args) =>
        String(args[0]).includes("Maximum update depth exceeded")
      );
      expect(loopWarnings).toHaveLength(0);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
