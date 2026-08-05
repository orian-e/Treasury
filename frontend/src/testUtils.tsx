import React from "react";
import { render } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./styles/theme";

// Custom render function that includes MUI theme
export const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

// Mock data helpers
export const mockUser = {
  id: "1",
  name: "Test User",
  email: "test@example.com",
  groupIds: ["group1"],
};

export const mockGroup = {
  id: "group1",
  name: "Test Group",
  description: "Test Description",
  creatorId: "1",
};

export const mockExpense = {
  id: "1",
  description: "Test Expense",
  amount: 100,
  currency: "EUR",
  date: "2025-01-01",
  payerId: "1",
  splits: [{ userId: "1", amount: 100 }],
  groupId: "group1",
};
