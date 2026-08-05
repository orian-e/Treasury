import { Expense } from "../models/Users";

export const SUPPORTED_CURRENCIES = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "ILS", symbol: "₪", name: "Israeli New Shekel" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
];

export const getCurrencySymbol = (currencyCode: string): string => {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
};

export const formatCurrency = (
  amount: number,
  currencyCode: string = "USD"
): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)}`;
};

// Group expenses by currency
export const groupExpensesByCurrency = (
  expenses: Expense[]
): Record<string, Expense[]> => {
  return expenses.reduce((acc, expense) => {
    const currency = expense.currency || "EUR";
    if (!acc[currency]) acc[currency] = [];
    acc[currency].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);
};
