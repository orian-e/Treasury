import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../styles/theme";
import { SettlementPanel } from "../../components/SettlementPanel";
import { seedUsers, seedExpenses } from "../utils/mockData";
import { Expense } from "../../models/Users";

// Mock userDisplay to return the user name directly
jest.mock("../../utils/userDisplay", () => ({
  getUserDisplayName: jest.fn((user) => user?.name || "Unknown"),
}));

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

// Helper to group expenses by currency
const groupByCurrency = (expenses: Expense[]): Record<string, Expense[]> => {
  return expenses.reduce((acc, exp) => {
    const curr = exp.currency || "EUR";
    if (!acc[curr]) acc[curr] = [];
    acc[curr].push(exp);
    return acc;
  }, {} as Record<string, Expense[]>);
};

describe("SettlementPanel", () => {
  it("should render empty state when no settlements exist", () => {
    renderWithTheme(
      <SettlementPanel users={seedUsers} expensesByCurrency={{}} />
    );

    expect(screen.getByText("No settlements needed")).toBeInTheDocument();
    expect(screen.getByText("All balances are settled up!")).toBeInTheDocument();
  });

  it("should render empty state for self-paid expenses", () => {
    // An expense where one person pays and only they are in the split
    const selfExpenses: Expense[] = [
      {
        id: "self1",
        description: "Self expense",
        amount: 100,
        currency: "EUR",
        date: "2025-01-01",
        payerId: "u1",
        payers: [{ userId: "u1", amount: 100 }],
        splits: [{ userId: "u1", amount: 100 }],
        groupId: "g1",
      },
    ];

    renderWithTheme(
      <SettlementPanel
        users={seedUsers}
        expensesByCurrency={{ EUR: selfExpenses }}
      />
    );

    expect(screen.getByText("No settlements needed")).toBeInTheDocument();
  });

  it("should correctly render settlements between multiple users", () => {
    // Use a simple 2-person expense: u1 pays 100, split equally between u1 and u2
    const twoPersonExpenses: Expense[] = [
      {
        id: "t1",
        description: "Dinner",
        amount: 100,
        currency: "EUR",
        date: "2025-01-01",
        payerId: "u1",
        payers: [{ userId: "u1", amount: 100 }],
        splits: [
          { userId: "u1", amount: 50 },
          { userId: "u2", amount: 50 },
        ],
        groupId: "g1",
      },
    ];

    const users = seedUsers.filter((u) => u.id === "u1" || u.id === "u2");

    renderWithTheme(
      <SettlementPanel
        users={users}
        expensesByCurrency={{ EUR: twoPersonExpenses }}
      />
    );

    // Should show EUR currency header (rendered as "€ EUR")
    expect(screen.getByText(/EUR/)).toBeInTheDocument();

    // Should show the correct settlement amount and count
    expect(screen.getByText("€50.00")).toBeInTheDocument();
    expect(screen.getByText("1 settlement")).toBeInTheDocument();
  });

  it("should handle multi-currency expenses correctly", () => {
    // Filter seed expenses for group g1 which has both EUR and GBP expenses
    const g1Expenses = seedExpenses.filter((e) => e.groupId === "g1");
    const expensesByCurrency = groupByCurrency(g1Expenses);

    renderWithTheme(
      <SettlementPanel
        users={seedUsers}
        expensesByCurrency={expensesByCurrency}
      />
    );

    // Should show both currency headers (rendered as "€ EUR" and "£ GBP")
    expect(screen.getByText(/EUR/)).toBeInTheDocument();
    expect(screen.getByText(/GBP/)).toBeInTheDocument();
  });
});
