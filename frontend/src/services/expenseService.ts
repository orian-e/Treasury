import { Expense } from "../models/Users";
import { apiRequest } from "../utils/api";

export const expenseService = {
  async getExpenses(): Promise<Expense[]> {
    const response = await apiRequest("/expenses");
    if (!response.ok) throw new Error("Failed to fetch expenses");
    return response.json();
  },

  async createExpense(expenseData: Omit<Expense, "id">): Promise<Expense> {
    const response = await apiRequest("/expenses", {
      method: "POST",
      body: JSON.stringify(expenseData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create expense");
    }
    return response.json();
  },

  async updateExpense(id: string, expenseData: Expense): Promise<Expense> {
    const response = await apiRequest(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(expenseData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update expense");
    }
    return response.json();
  },

  async deleteExpense(id: string): Promise<void> {
    const response = await apiRequest(`/expenses/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete expense");
    }
  },
};