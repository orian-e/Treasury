import {
  SUPPORTED_CURRENCIES,
  getCurrencySymbol,
  formatCurrency,
  groupExpensesByCurrency,
} from "../../utils/currencies";
import { Expense } from "../../models/Users";

describe("Currency Utilities", () => {
  describe("getCurrencySymbol", () => {
    it("should return correct symbols for supported currencies", () => {
      expect(getCurrencySymbol("EUR")).toBe("€");
      expect(getCurrencySymbol("USD")).toBe("$");
      expect(getCurrencySymbol("GBP")).toBe("£");
      expect(getCurrencySymbol("JPY")).toBe("¥");
    });

    it("should return currency code for unsupported currencies", () => {
      expect(getCurrencySymbol("XYZ")).toBe("XYZ");
      expect(getCurrencySymbol("")).toBe("");
    });
  });

  describe("formatCurrency", () => {
    it("should format currency with correct symbols and amounts", () => {
      expect(formatCurrency(123.45, "USD")).toBe("$123.45");
      expect(formatCurrency(100, "EUR")).toBe("€100.00");
      expect(formatCurrency(0, "GBP")).toBe("£0.00");
    });

    it("should handle negative amounts", () => {
      expect(formatCurrency(-50.25, "USD")).toBe("$-50.25");
    });

    it("should round to 2 decimal places", () => {
      expect(formatCurrency(123.456, "USD")).toBe("$123.46");
      expect(formatCurrency(123.454, "USD")).toBe("$123.45");
    });

    it("should default to USD when no currency provided", () => {
      expect(formatCurrency(100)).toBe("$100.00");
    });
  });

  describe("groupExpensesByCurrency", () => {
    const mockExpenses: Expense[] = [
      {
        id: "1",
        amount: 100,
        currency: "USD",
        description: "USD Expense",
        date: "2025-01-01",
        payerId: "user1",
        splits: [],
        groupId: "group1",
      },
      {
        id: "2",
        amount: 50,
        currency: "EUR",
        description: "EUR Expense",
        date: "2025-01-02",
        payerId: "user1",
        splits: [],
        groupId: "group1",
      },
      {
        id: "3",
        amount: 75,
        currency: "USD",
        description: "Another USD Expense",
        date: "2025-01-03",
        payerId: "user2",
        splits: [],
        groupId: "group1",
      },
    ];

    it("should group expenses by currency", () => {
      const grouped = groupExpensesByCurrency(mockExpenses);

      expect(Object.keys(grouped).sort()).toEqual(["EUR", "USD"]);
      expect(grouped.USD).toHaveLength(2);
      expect(grouped.EUR).toHaveLength(1);
      expect(grouped.USD[0].description).toBe("USD Expense");
      expect(grouped.EUR[0].description).toBe("EUR Expense");
    });

    it("should handle expenses without currency (default to EUR)", () => {
      const expensesWithoutCurrency: Expense[] = [
        {
          id: "1",
          amount: 100,
          currency: "",
          description: "No Currency",
          date: "2025-01-01",
          payerId: "user1",
          splits: [],
          groupId: "group1",
        },
      ];

      const grouped = groupExpensesByCurrency(expensesWithoutCurrency);
      expect(grouped.EUR).toHaveLength(1);
      expect(grouped.EUR[0].description).toBe("No Currency");
    });

    it("should handle empty expense array", () => {
      const grouped = groupExpensesByCurrency([]);
      expect(grouped).toEqual({});
    });
  });

  describe("SUPPORTED_CURRENCIES", () => {
    it("should have required properties for each currency", () => {
      SUPPORTED_CURRENCIES.forEach((currency) => {
        expect(currency).toHaveProperty("code");
        expect(currency).toHaveProperty("symbol");
        expect(currency).toHaveProperty("name");
        expect(typeof currency.code).toBe("string");
        expect(typeof currency.symbol).toBe("string");
        expect(typeof currency.name).toBe("string");
      });
    });

    it("should have unique currency codes", () => {
      const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });

    it("should include EUR and USD as primary currencies", () => {
      const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
      expect(codes).toContain("EUR");
      expect(codes).toContain("USD");
    });
  });
});
