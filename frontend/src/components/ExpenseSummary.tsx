import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  CircularProgress,
  Button,
} from "@mui/material";
import React, { useMemo } from "react";
import { Expense, User, hasMultiplePayers } from "../models/Users";
import { getUserDisplayName } from "../utils/userDisplay";
import { formatCurrency } from "../utils/currencies";
import { computeBalancesForCurrency } from "../utils/balances";
import CurrencySection from "./CurrencySection";
import { cardContainerStyles } from "../styles/componentStyles";

interface ExpenseSummaryProps {
  expenses: Expense[];
  users: User[];
  loading?: boolean;
  groupName?: string;
  onViewSettlements?: () => void;
}

const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({
  expenses,
  users,
  loading = false,
  groupName,
  onViewSettlements,
}) => {
  // Group expenses by currency
  const expensesByCurrency = React.useMemo(() => {
    return expenses.reduce((acc, expense) => {
      const currency = expense.currency || "EUR";
      if (!acc[currency]) acc[currency] = [];
      acc[currency].push(expense);
      return acc;
    }, {} as Record<string, Expense[]>);
  }, [expenses]);

  const renderCurrencySummary = (
    currency: string,
    currencyExpenses: Expense[]
  ) => {
    const balances: Record<string, number> = computeBalancesForCurrency(
      users,
      currencyExpenses
    );

    return (
      <CurrencySection
        key={currency}
        currency={currency}
        contextLabel="Summary"
        dataTestId={`currency-header-${currency}`}
      >
        <List sx={{ py: 0 }}>
          {users.map((user) => (
            <ListItem key={user.id} sx={{ py: 0.25 }}>
              <ListItemText
                data-testid={`balance-${user.id}`}
                primary={
                  <Box sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {balances[user.id] > 0.01 ? (
                      <Box component="span" sx={{ color: "success.main" }}>
                        {getUserDisplayName(user, users)} is owed{" "}
                        <strong>{formatCurrency(balances[user.id], currency)}</strong>
                      </Box>
                    ) : balances[user.id] < -0.01 ? (
                      <Box component="span" sx={{ color: "error.main" }}>
                        {getUserDisplayName(user, users)} owes{" "}
                        <strong>{formatCurrency(Math.abs(balances[user.id]), currency)}</strong>
                      </Box>
                    ) : (
                      <span>
                        {getUserDisplayName(user, users)}{" "}
                        <strong>is settled up</strong>
                      </span>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CurrencySection>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          maxWidth: 600,
          margin: "20px auto",
          padding: 2,
          textAlign: "center",
        }}
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading expenses...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={cardContainerStyles}>
      <Typography
        variant="h6"
        gutterBottom
        sx={{
          fontWeight: 600,
          color: "primary.main",
          borderBottom: "2px solid",
          borderColor: "primary.main",
          pb: 1,
        }}
      >
        📊{" "}
        {groupName ? (
          <>
            <Box
              component="span"
              sx={{
                fontWeight: 700,
                color: "primary.main",
                backgroundColor: "rgba(103, 58, 183, 0.08)",
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                px: 1,
                py: 0.2,
                borderRadius: 1,
                mr: 1,
              }}
            >
              {groupName}
            </Box>
            Summary
          </>
        ) : (
          "Expense Summary"
        )}
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : Object.keys(expensesByCurrency).length === 0 ? (
        <Typography align="center" color="text.secondary" sx={{ mt: 2 }}>
          No expenses to display. Add your first expense!
        </Typography>
      ) : (
        <>
          {Object.entries(expensesByCurrency).map(
            ([currency, currencyExpenses]) =>
              renderCurrencySummary(currency, currencyExpenses as Expense[])
          )}
          <Box
            sx={{
              mt: 3,
              pt: 2,
              borderTop: "1px solid",
              borderColor: "divider",
              textAlign: "right",
            }}
          >
            <Button
              variant="contained"
              color="primary"
              size="medium"
              onClick={onViewSettlements}
              fullWidth
              sx={{
                textTransform: "none",
                fontWeight: 500,
                py: 1,
                "&:hover": {
                  transform: "translateY(-1px)",
                  boxShadow: 2,
                },
                transition: "all 0.2s ease-in-out",
              }}
            >
              View Settlements
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ExpenseSummary;
