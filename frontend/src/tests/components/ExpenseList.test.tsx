import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpenseList from "../../components/ExpenseList";
import { Expense } from "../../models/Users";
import { seedExpenses, seedUsers } from "../utils/mockData";

// g1 gives three expenses across two currencies (EUR + GBP). Clara Fernández
// (u3) is in every split but is never a payer here, so searching for her name
// exercises split matching and accent normalization at once.
const g1Expenses = seedExpenses.filter((e) => e.groupId === "g1");

// Every seed user appears in every g1 split, so no name there can isolate a
// payer match. Alice pays for the taxi without being one of its splits, and
// is absent from the museum entirely.
const payerOnlyExpenses: Expense[] = [
  {
    id: "p1",
    description: "Taxi to airport",
    amount: 30,
    currency: "EUR",
    date: new Date("2026-01-05").toISOString(),
    groupId: "g1",
    payerId: "u1",
    payers: [{ userId: "u1", amount: 30 }],
    splits: [
      { userId: "u2", amount: 15 },
      { userId: "u3", amount: 15 },
    ],
  },
  {
    id: "p2",
    description: "Museum tickets",
    amount: 40,
    currency: "EUR",
    date: new Date("2026-01-06").toISOString(),
    groupId: "g1",
    payerId: "u2",
    payers: [{ userId: "u2", amount: 40 }],
    splits: [
      { userId: "u2", amount: 20 },
      { userId: "u3", amount: 20 },
    ],
  },
];

const defaultProps = {
  users: seedUsers,
  expenses: g1Expenses,
  onDeleteExpense: jest.fn(),
  onEditExpense: jest.fn(),
};

const search = () => screen.getByLabelText("Search expenses");

const typeSearch = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.click(search());
  await user.keyboard(text);
};

describe("ExpenseList search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows every expense by default", () => {
    render(<ExpenseList {...defaultProps} />);

    expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
    expect(screen.getByText("IKEA order (UK warehouse)")).toBeInTheDocument();
    expect(
      screen.getByText("ארוחת ערב משותפת — Shared dinner")
    ).toBeInTheDocument();
  });

  it("does not render the search box when there are no expenses at all", () => {
    render(<ExpenseList {...defaultProps} expenses={[]} />);

    expect(screen.queryByLabelText("Search expenses")).not.toBeInTheDocument();
    expect(
      screen.getByText("No expenses yet. Add your first expense!")
    ).toBeInTheDocument();
  });

  it("filters by description", async () => {
    const user = userEvent.setup();
    render(<ExpenseList {...defaultProps} />);

    await typeSearch(user, "ikea");

    expect(screen.getByText("IKEA order (UK warehouse)")).toBeInTheDocument();
    expect(screen.queryByText("Weekly groceries")).not.toBeInTheDocument();
  });

  it("filters by payer name", async () => {
    const user = userEvent.setup();
    render(<ExpenseList {...defaultProps} expenses={payerOnlyExpenses} />);

    await typeSearch(user, "alice");

    expect(screen.getByText("Taxi to airport")).toBeInTheDocument();
    expect(screen.queryByText("Museum tickets")).not.toBeInTheDocument();
  });

  it("matches anyone involved, as payer or as ower", async () => {
    const user = userEvent.setup();
    render(<ExpenseList {...defaultProps} />);

    // Bob paid for the IKEA order and owes on the other two, so searching his
    // name surfaces everything he is involved in rather than only what he paid.
    await typeSearch(user, "bob");

    expect(screen.getByText("Showing 3 of 3 expenses")).toBeInTheDocument();
  });

  it("filters by split participant, ignoring accents", async () => {
    const user = userEvent.setup();
    render(<ExpenseList {...defaultProps} />);

    // Clara is only ever in the splits, never a payer in g1 -- a
    // description+payer-only implementation would return nothing here.
    await typeSearch(user, "fernandez");

    expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
    expect(screen.getByText("IKEA order (UK warehouse)")).toBeInTheDocument();
    expect(
      screen.getByText("ארוחת ערב משותפת — Shared dinner")
    ).toBeInTheDocument();
  });

  it("filters by amount", async () => {
    const user = userEvent.setup();
    render(<ExpenseList {...defaultProps} />);

    await typeSearch(user, "87.60");

    expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
    expect(screen.queryByText("IKEA order (UK warehouse)")).not.toBeInTheDocument();
  });

  it("filters by currency and drops the emptied currency section", async () => {
    const user = userEvent.setup();
    render(<ExpenseList {...defaultProps} />);

    await typeSearch(user, "gbp");

    expect(screen.getByText("IKEA order (UK warehouse)")).toBeInTheDocument();
    expect(screen.getByText("£ GBP")).toBeInTheDocument();
    expect(screen.queryByText("€ EUR")).not.toBeInTheDocument();
  });

  it("reports how many of the total are showing", async () => {
    const user = userEvent.setup();
    render(<ExpenseList {...defaultProps} />);

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();

    await typeSearch(user, "ikea");

    expect(screen.getByText("Showing 1 of 3 expenses")).toBeInTheDocument();
  });

  it("distinguishes an empty search result from an empty list", async () => {
    const user = userEvent.setup();
    render(<ExpenseList {...defaultProps} />);

    await typeSearch(user, "zzzznotathing");

    expect(
      screen.getByText("No expenses match your search.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No expenses yet. Add your first expense!")
    ).not.toBeInTheDocument();
    // The box must survive a zero-match query, or the search is unescapable.
    expect(search()).toBeInTheDocument();
  });

  it("restores the full list via the clear button", async () => {
    const user = userEvent.setup();
    render(<ExpenseList {...defaultProps} />);

    await typeSearch(user, "ikea");
    expect(screen.queryByText("Weekly groceries")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Clear search"));

    expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
    expect(screen.getByText("IKEA order (UK warehouse)")).toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it("clears the search when an edit starts so the saved expense stays visible", async () => {
    const user = userEvent.setup();
    render(<ExpenseList {...defaultProps} />);

    await typeSearch(user, "ikea");
    await user.click(screen.getByLabelText("edit"));

    expect(defaultProps.onEditExpense).toHaveBeenCalledWith(
      g1Expenses.find((e) => e.id === "e2")
    );
    expect(search()).toHaveValue("");
    expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
  });
});

describe("ExpenseList delete confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Searching first narrows the list to one row, so "delete" is unambiguous.
  const clickDeleteOnIkea = async (user: ReturnType<typeof userEvent.setup>) => {
    render(<ExpenseList {...defaultProps} />);
    await typeSearch(user, "ikea");
    await user.click(screen.getByLabelText("delete"));
  };

  it("asks before deleting instead of deleting on the icon click", async () => {
    const user = userEvent.setup();
    await clickDeleteOnIkea(user);

    expect(screen.getByText("Delete Expense")).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete "IKEA order (UK warehouse)"?')
    ).toBeInTheDocument();
    expect(defaultProps.onDeleteExpense).not.toHaveBeenCalled();
  });

  it("deletes once confirmed", async () => {
    const user = userEvent.setup();
    await clickDeleteOnIkea(user);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(defaultProps.onDeleteExpense).toHaveBeenCalledWith("e2");
  });

  it("keeps the expense when cancelled", async () => {
    const user = userEvent.setup();
    await clickDeleteOnIkea(user);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(defaultProps.onDeleteExpense).not.toHaveBeenCalled();
    expect(screen.getByText("IKEA order (UK warehouse)")).toBeInTheDocument();
  });
});
