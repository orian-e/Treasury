import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpenseForm from "../../components/ExpenseForm";
import { seedUsers, seedGroups } from "../utils/mockData";

// Mock the date pickers because date-fns v4 throws ESM parsing errors in standard CRA Jest
jest.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@mui/x-date-pickers', () => ({
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DatePicker: () => <input type="text" data-testid="mock-date-picker" />,
}));

const defaultProps = {
  onAddExpense: jest.fn(),
  users: seedUsers,
  groups: seedGroups,
  selectedGroupId: "g1", // Flatmates
  onGroupChange: jest.fn(),
};

describe("ExpenseForm - Integration Tests", () => {
  let mockOnAddExpense: jest.Mock;

  // The form scrolls itself into view when an edit starts; jsdom has no layout.
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAddExpense = jest.fn();
    defaultProps.onAddExpense = mockOnAddExpense;
  });

  const fillBasicForm = async (user: any, desc: string, amount: string) => {
    await user.type(screen.getByLabelText(/description/i), desc);
    await user.type(screen.getByLabelText(/amount/i), amount);
  };

  // Drives the real SplitSelector. Splits are derived from the amount, so fill
  // the amount first or every share comes out as 0.
  const splitWith = async (user: any, ...names: RegExp[]) => {
    await user.click(screen.getByLabelText(/split with/i));
    for (const name of names) {
      await user.click(await screen.findByRole("option", { name }));
    }
    await user.click(screen.getByRole("button", { name: "Done" }));
  };

  it("should render currency selector and default to EUR", () => {
    render(<ExpenseForm {...defaultProps} />);
    // Check that the EUR currency is rendered somewhere in the form
    expect(screen.getByText(/EUR/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
  });

  it("should validate required fields before submission", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm {...defaultProps} />);

    // Nothing is filled in, but an empty split is not itself an error, so the
    // button is live and submitting has to be what surfaces the problems.
    const submitBtn = screen.getByRole("button", { name: /add expense/i });
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    expect(await screen.findByText(/Description is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Please enter a valid amount/i)).toBeInTheDocument();
    expect(mockOnAddExpense).not.toHaveBeenCalled();
  });

  it("should submit a valid single-payer basic expense with equal splits", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm {...defaultProps} />);

    await fillBasicForm(user, "Internet Bill", "50");

    await splitWith(user, /Alice Martin/, /Bob Chen/);

    // Now submit
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      expect(mockOnAddExpense).toHaveBeenCalledWith(expect.objectContaining({
        description: "Internet Bill",
        amount: 50,
        currency: "EUR", // Default
        groupId: "g1",
      }));
    });
    
    // Check splits array payload length
    const submittedData = mockOnAddExpense.mock.calls[0][0];
    expect(submittedData.splits).toHaveLength(2);
    expect(submittedData.splits[0].amount).toBeCloseTo(25); // 50 / 2
  });

  it("should update currency correctly and submit", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm {...defaultProps} />);

    // Change to GBP — find the currency select
    const currencySelects = screen.getAllByRole("combobox");
    // Click the currency dropdown (typically the second combobox after group)
    await user.click(currencySelects[1]);

    // Select GBP from the options
    const gbpOption = await screen.findByRole("option", { name: /GBP/i });
    await user.click(gbpOption);

    await fillBasicForm(user, "London trip prep", "200");
    await splitWith(user, /Alice Martin/);

    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      expect(mockOnAddExpense).toHaveBeenCalledWith(expect.objectContaining({
        description: "London trip prep",
        amount: 200,
        currency: "GBP",
      }));
    });
  });

  it("should disable submit button if the real SplitSelector has validation errors", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm {...defaultProps} />);

    await fillBasicForm(user, "Validation Test", "100");
    await splitWith(user, /Alice Martin/, /Bob Chen/);

    // Percentage mode starts at 0% for everyone, which is a real split error.
    await user.click(screen.getByRole("button", { name: "Percentage" }));

    // The error should bubble up to the form via the onError callback
    expect(
      await screen.findByText(/Percentages must total exactly 100%/i)
    ).toBeInTheDocument();

    // The form submit button should be disabled
    const submitBtn = screen.getByRole("button", { name: /add expense/i });
    expect(submitBtn).toBeDisabled();
  });

  it("should correctly switch between single payer and multiple payer modes", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm {...defaultProps} />);

    // Initially should show "Paid by" select (single payer mode)
    expect(screen.getByLabelText("Paid by")).toBeInTheDocument();

    // Click "Multiple Payers" button
    await user.click(screen.getByRole("button", { name: /multiple payers/i }));

    // Now should show "Add Payer" and "Remove" buttons
    expect(screen.getByRole("button", { name: /add payer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();

    // Switch back to single payer
    await user.click(screen.getByRole("button", { name: /single payer/i }));

    // "Paid by" select should reappear
    expect(screen.getByLabelText("Paid by")).toBeInTheDocument();
  });

  it("should correctly initialize with editingExpense data when passed", () => {
    const editingExpense = {
      id: "e_edit",
      description: "Groceries",
      amount: 75.50,
      currency: "GBP",
      date: "2025-06-15",
      payerId: "u1",
      payers: [],
      splits: [
        { userId: "u1", amount: 37.75 },
        { userId: "u2", amount: 37.75 },
      ],
      groupId: "g1",
    };

    render(
      <ExpenseForm
        {...defaultProps}
        editingExpense={editingExpense}
        onEditExpense={jest.fn()}
        onCancelEdit={jest.fn()}
      />
    );

    // Should show "Edit Expense" heading
    expect(screen.getByText("Edit Expense")).toBeInTheDocument();

    // Should show "Update Expense" submit button instead of "Add Expense"
    expect(screen.getByRole("button", { name: /update expense/i })).toBeInTheDocument();

    // Should show Cancel button
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();

    // Form fields should be pre-filled
    expect(screen.getByLabelText(/description/i)).toHaveValue("Groceries");
    expect(screen.getByLabelText(/amount/i)).toHaveValue(75.5);
  });

  it("should submit an edited expense without changing its split data", async () => {
    const user = userEvent.setup();
    const onEditExpense = jest.fn();
    const editingExpense = {
      id: "e_edit",
      description: "Groceries",
      amount: 75.5,
      currency: "GBP",
      date: "2025-06-15",
      payerId: "u1",
      payers: [],
      splits: [
        { userId: "u1", amount: 37.75 },
        { userId: "u2", amount: 37.75 },
      ],
      groupId: "g1",
    };

    render(
      <ExpenseForm
        {...defaultProps}
        editingExpense={editingExpense}
        onEditExpense={onEditExpense}
        onCancelEdit={jest.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /update expense/i }));

    expect(onEditExpense).toHaveBeenCalledTimes(1);
    expect(onEditExpense).toHaveBeenCalledWith(editingExpense);
  });

  it("should validate that multiple payers' amounts equal the total expense amount", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm {...defaultProps} />);

    await fillBasicForm(user, "Multi-payer test", "100");

    // Switch to multiple payers mode
    await user.click(screen.getByRole("button", { name: /multiple payers/i }));

    // The default payer amount is set to the expense amount for the first payer
    // But the total won't match if you change the amount afterwards.
    // Clear and type a mismatched amount for the first payer
    // Both the Amount field and the payer amount field show "100", so use getAllBy and pick the payer one (second match)
    const allAmountInputs = screen.getAllByDisplayValue("100");
    const payerAmountInput = allAmountInputs[allAmountInputs.length - 1];
    await user.clear(payerAmountInput);
    await user.type(payerAmountInput, "50");

    // Set valid splits
    await splitWith(user, /Alice Martin/, /Bob Chen/);

    // Submit
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    // Should show the payer amount mismatch error
    await waitFor(() => {
      expect(
        screen.getByText(/total paid amount/i)
      ).toBeInTheDocument();
    });

    expect(mockOnAddExpense).not.toHaveBeenCalled();
  });
});
