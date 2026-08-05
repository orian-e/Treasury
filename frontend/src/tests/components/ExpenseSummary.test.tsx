import React from "react";
import { render, screen } from "@testing-library/react";
import ExpenseSummary from "../../components/ExpenseSummary";

// FIXED: Define mocks inside the jest.mock calls to avoid hoisting issues
jest.mock("../../utils/userDisplay", () => ({
  getUserDisplayName: jest.fn((user) => user?.name || "Unknown"),
}));

jest.mock("../../utils/currencies", () => ({
  formatCurrency: jest.fn((amount, currency) => `$${amount.toFixed(2)}`),
  getCurrencySymbol: jest.fn(() => "$"),
}));

// Import the mocked functions after mocking
import { getUserDisplayName } from "../../utils/userDisplay";
import { formatCurrency, getCurrencySymbol } from "../../utils/currencies";

const mockGetUserDisplayName = getUserDisplayName as jest.MockedFunction<
  typeof getUserDisplayName
>;
const mockFormatCurrency = formatCurrency as jest.MockedFunction<
  typeof formatCurrency
>;
const mockGetCurrencySymbol = getCurrencySymbol as jest.MockedFunction<
  typeof getCurrencySymbol
>;

const testUsers = [
  { id: "1", name: "Alice", email: "alice@test.com", groupIds: ["g1"] },
  { id: "2", name: "Bob", email: "bob@test.com", groupIds: ["g1"] },
  { id: "3", name: "Charlie", email: "charlie@test.com", groupIds: ["g1"] },
];

describe("ExpenseSummary - Balance Calculations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // CONCISE DEBUG TEST
  it("should handle unequal splits correctly", () => {
    const expenses = [
      {
        id: "1",
        description: "Dinner",
        amount: 100,
        currency: "USD",
        date: "2025-01-01T00:00:00.000Z",
        payerId: "1",
        groupId: "g1",
        splits: [{ userId: "1", amount: 20 }],
      },
    ];

    render(<ExpenseSummary expenses={expenses} users={testUsers} />);

    const balance1 = screen.getByTestId("balance-1");
    expect(balance1).toHaveTextContent("is owed");
  });

  // Keep your other working tests...
  it("should calculate balances correctly for single currency", () => {
    const expenses = [
      {
        id: "1",
        description: "Dinner",
        amount: 120,
        currency: "USD",
        date: "2025-01-01T00:00:00.000Z",
        payerId: "1",
        groupId: "g1",
        splits: [
          { userId: "1", amount: 40 },
          { userId: "2", amount: 40 },
          { userId: "3", amount: 40 },
        ],
      },
    ];

    render(<ExpenseSummary expenses={expenses} users={testUsers} />);
    expect(screen.getByTestId("currency-header-USD")).toBeInTheDocument();
    expect(screen.getByTestId("balance-1")).toHaveTextContent("is owed");
    expect(screen.getByTestId("balance-2")).toHaveTextContent("owes");
    expect(screen.getByTestId("balance-3")).toHaveTextContent("owes");
  });

  it("should handle negative amounts (repayments) correctly", () => {
    const expenses = [
      {
        id: "1",
        description: "Repayment",
        amount: -50,
        currency: "EUR",
        date: "2025-01-01T00:00:00.000Z",
        payerId: "1",
        groupId: "g1",
        splits: [{ userId: "1", amount: -50 }],
      },
    ];

    render(
      <ExpenseSummary expenses={expenses} users={testUsers.slice(0, 2)} />
    );
    expect(screen.getByTestId("currency-header-EUR")).toBeInTheDocument();
    expect(screen.getByTestId("balance-1")).toHaveTextContent("is settled up");
    expect(screen.getByTestId("balance-2")).toHaveTextContent("is settled up");
  });

  it("should show settled up status when balance is zero", () => {
    const expenses = [
      {
        id: "1",
        description: "Self expense",
        amount: 100,
        currency: "USD",
        date: "2025-01-01T00:00:00.000Z",
        payerId: "1",
        groupId: "g1",
        splits: [{ userId: "1", amount: 100 }],
      },
    ];

    render(<ExpenseSummary expenses={expenses} users={testUsers} />);
    expect(screen.getByTestId("balance-1")).toHaveTextContent("is settled up");
    expect(screen.getByTestId("balance-2")).toHaveTextContent("is settled up");
    expect(screen.getByTestId("balance-3")).toHaveTextContent("is settled up");
  });
});

describe("ExpenseSummary - Loading and Empty States", () => {
  it("should show loading state", () => {
    render(<ExpenseSummary expenses={[]} users={[]} loading={true} />);
    expect(screen.getByText("Loading expenses...")).toBeInTheDocument();
  });

  it("should handle empty expenses gracefully", () => {
    render(<ExpenseSummary expenses={[]} users={testUsers} />);
    expect(screen.getByText(/Expense Summary/)).toBeInTheDocument();
  });
});
