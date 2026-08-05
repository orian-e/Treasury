import { format } from "date-fns";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
} from "@mui/material";
import { listContainerStyles } from "../styles/componentStyles";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import React from "react";
import { Expense, User, hasMultiplePayers, getExpensePayers } from "../models/Users";
import { CircularProgress } from "@mui/material";
import { getUserDisplayName } from "../utils/userDisplay";
import { formatCurrency } from "../utils/currencies";
import { groupExpensesByCurrency } from "../utils/currencies";
import { getCurrencySymbol } from "../utils/currencies";
import CurrencySection from "./CurrencySection";

interface ExpenseListProps {
  users: User[];
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onEditExpense: (expense: Expense) => void;
  loading?: boolean;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  users,
  expenses,
  onDeleteExpense,
  onEditExpense,
  loading = false,
}) => {
  // Group expenses by currency for better display
  const expensesByCurrency = groupExpensesByCurrency(expenses);

  return (
    <Box sx={listContainerStyles}>
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{
          fontWeight: 600,
          color: "primary.main",
          borderBottom: "2px solid",
          borderColor: "primary.main",
          pb: 1,
        }}
      >
        📋 Expense List
      </Typography>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Retrieving your expenses...
          </Typography>
        </Box>
      ) : (
        <>
          {Object.keys(expensesByCurrency).length === 0 && (
            <Typography align="center" color="text.secondary" sx={{ mt: 2 }}>
              No expenses yet. Add your first expense!
            </Typography>
          )}
          {Object.entries(expensesByCurrency).map(
            ([currency, currencyExpenses]) => (
              <CurrencySection
                key={currency}
                currency={currency}
                contextLabel="Expenses"
              >
                <List sx={{ py: 0 }}>
                  {currencyExpenses.map((expense) => {
                    // Handle both single payer (backward compatibility) and multiple payers
                    const payers = hasMultiplePayers(expense) 
                      ? (expense.payers || [])
                          .map(p => ({
                            user: users.find(u => u?.id === p.userId),
                            amount: p.amount
                          }))
                          .filter(p => p.user) // Filter out any undefined users
                      : [{
                          user: users.find(u => u?.id === expense.payerId),
                          amount: expense.amount
                        }].filter(p => p.user); // Filter out if user is undefined

                    const payerDisplay = payers.length > 0
                      ? payers
                          .map(p => `${getUserDisplayName(p.user, users)} (${formatCurrency(p.amount, expense.currency || 'EUR')})`)
                          .join(' + ')
                      : 'Unknown Payer';
                      
                    const splitDetails = (expense.splits || [])
                      .map((split) => {
                        const user = users.find((u) => u?.id === split.userId);
                        return `${getUserDisplayName(user, users)}: ${formatCurrency(
                          split.amount,
                          expense.currency || "EUR"
                        )}`;
                      })
                      .join(", ");

                    return (
                      <ListItem
                        key={expense.id}
                        sx={{
                          borderBottom: "1px solid",
                          borderBottomColor: "divider",
                          alignItems: "center",
                          justifyContent: "space-between",
                          py: 0.75,
                          display: "flex",
                          flexDirection: "row",
                          bgcolor: "background.default",
                          borderRadius: 2,
                          mb: 0.25,
                          boxShadow: 1,
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              variant="h6"
                              sx={{
                                wordWrap: "break-word",
                                overflowWrap: "break-word",
                              }}
                            >
                              {expense.description}
                            </Typography>
                          }
                          secondary={
                            <>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "0.875rem",
                                  color: "rgba(0, 0, 0, 0.6)",
                                }}
                              >
                                {expense.date ? format(new Date(expense.date), "PPP p") : 'No date'}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "0.875rem",
                                }}
                              >
                                Paid by {payerDisplay}{expense.date ? ` • ${format(
                                  new Date(expense.date),
                                  "MMM d, yyyy"
                                )}` : ''}
                              </span>
                              {/* TOTAL AMOUNT */}
                              <span
                                style={{
                                  display: "block",
                                  fontSize: "0.95rem",
                                  fontWeight: 600,
                                  color: "#333",
                                }}
                              >
                                Total:{" "}
                                {getCurrencySymbol(expense.currency || "EUR")}
                                {expense.amount.toFixed(2)}
                              </span>

                              <span
                                style={{
                                  display: "block",
                                  fontSize: "0.875rem",
                                  color: "rgba(0, 0, 0, 0.6)",
                                  lineHeight: "1.4",
                                  wordBreak: "break-word",
                                }}
                              >
                                {splitDetails}
                              </span>
                            </>
                          }
                        />
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            ml: 2,
                          }}
                        >
                          <IconButton
                            edge="end"
                            aria-label="edit"
                            onClick={() => onEditExpense(expense)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => onDeleteExpense(expense.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItem>
                    );
                  })}
                </List>
              </CurrencySection>
            )
          )}
        </>
      )}
    </Box>
  );
};

export default ExpenseList;
