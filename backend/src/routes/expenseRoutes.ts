import { Router } from "express";
import ExpenseController from "../controllers/expenseController";
import { authenticateToken } from "../middleware/auth";

const expenseController = new ExpenseController();

export function setExpenseRoutes(app: Router) {
  app.post(
    "/expenses",
    authenticateToken,
    expenseController.createExpense.bind(expenseController)
  );
  app.get(
    "/expenses",
    authenticateToken,
    expenseController.getExpenses.bind(expenseController)
  );
  app.delete(
    "/expenses/:id",
    authenticateToken,
    expenseController.deleteExpense.bind(expenseController)
  );
  app.put(
    "/expenses/:id",
    authenticateToken,
    expenseController.updateExpense.bind(expenseController)
  );
}
