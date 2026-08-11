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
import React, { useMemo, useState } from "react";
import { Expense, User, getExpensePayers } from "../models/Users";
import { CircularProgress } from "@mui/material";
import { getUserDisplayName } from "../utils/userDisplay";
import { formatCurrency } from "../utils/currencies";
import { groupExpensesByCurrency } from "../utils/currencies";
import { getCurrencySymbol } from "../utils/currencies";
import { matchesQuery } from "../utils/search";
import CurrencySection from "./CurrencySection";
import SearchField from "./SearchField";

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
  const [searchQuery, setSearchQuery] = useState("");

  // `expenses` is already scoped to the selected group upstream, so this is
  // purely narrowing what is already on screen.
  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const resolveName = (userId: string) =>
          getUserDisplayName(
            users.find((u) => u?.id === userId),
            users
          );

        return matchesQuery(
          [
            expense.description,
            ...getExpensePayers(expense).map((p) => resolveName(p.userId)),
            ...(expense.splits || []).map((s) => resolveName(s.userId)),
            expense.amount.toFixed(2),
            expense.currency,
          ],
          searchQuery
        );
      }),
    [expenses, users, searchQuery]
  );

  // Editing happens in the form above this list. Clearing the search keeps the
  // expense visible after a save that would no longer match the query.
  const handleEditExpense = (expense: Expense) => {
    setSearchQuery("");
    onEditExpense(expense);
  };

  // Group expenses by currency for better display
  const expensesByCurrency = groupExpensesByCurrency(filteredExpenses);

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

      {/* Gated on the unfiltered count, and kept outside the loading branch, so
          the box never disappears mid-search or while a refetch is running. */}
      {expenses.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            ariaLabel="Search expenses"
            placeholder="Search by what, who paid, who owes, or how much…"
          />
          {searchQuery.trim() !== "" && (
            <Typography
              className="search-field-status"
              variant="caption"
              color="text.secondary"
              aria-live="polite"
              sx={{ mt: 0.5 }}
            >
              Showing {filteredExpenses.length} of {expenses.length} expenses
            </Typography>
          )}
        </Box>
      )}

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
              {expenses.length === 0
                ? "No expenses yet. Add your first expense!"
                : "No expenses match your search."}
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
                    // getExpensePayers normalizes single-payer (payerId) and
                    // multi-payer (payers[]) expenses into one shape.
                    const payers = getExpensePayers(expense)
                      .map(p => ({
                        user: users.find(u => u?.id === p.userId),
                        amount: p.amount
                      }))
                      .filter(p => p.user); // Filter out any undefined users

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
                            onClick={() => handleEditExpense(expense)}
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
