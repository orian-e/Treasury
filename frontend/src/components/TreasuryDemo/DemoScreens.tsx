import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  Fade,
  Grow,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  DemoStep,
  DEMO_GROUPS,
  DEMO_SELECTED_GROUP,
  DEMO_BASE_EXPENSES,
  DEMO_NEW_EXPENSE,
  DEMO_SETTLEMENTS,
  DEMO_CURRENCY,
  DEMO_TOTAL,
} from "./demoData";

// Every screen below deliberately reuses Treasury's real visual language —
// the same Card/border/shadow treatment as GroupManagement, the same row
// style as ExpenseList, the same arrow-settlement layout as SettlementPanel,
// the same group-card shape as Totals — just with less content, smaller
// scale, and every field/button disabled (no handlers, no real form). See
// HOMEPAGE_DEMO_PLAN.md for why nothing here is interactive.

export const GroupsScreen: React.FC<{ step: DemoStep }> = ({ step }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    {DEMO_GROUPS.map((name) => {
      const selected = step === "groupSelected" && name === DEMO_SELECTED_GROUP;
      return (
        <Card
          key={name}
          sx={{
            borderRadius: 2,
            border: "2px solid",
            borderColor: selected ? "primary.main" : "divider",
            // Miniature scale: a hairline border already reads as a card
            // boundary, so unselected rows skip elevation entirely rather
            // than stacking several small shadows that look toy-like.
            boxShadow: selected ? 3 : 0,
            transition: "border-color 0.3s ease, box-shadow 0.3s ease",
          }}
        >
          <CardContent sx={{ p: "8px 10px !important", display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                bgcolor: selected ? "primary.main" : "primary.light",
                color: selected ? "common.white" : "primary.main",
                transition: "background-color 0.3s ease, color 0.3s ease",
              }}
            >
              <GroupsIcon sx={{ fontSize: 14 }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
              {name}
            </Typography>
            <Fade in={selected}>
              <Chip label="Selected" size="small" color="primary" sx={{ height: 18, fontSize: "0.65rem" }} />
            </Fade>
          </CardContent>
        </Card>
      );
    })}
  </Box>
);

export const ExpensesScreen: React.FC<{ step: DemoStep }> = ({ step }) => {
  const showForm = step === "expenseForm";
  const showNewExpense = step === "expenseSaved";

  // Reveal the three values in the same order a person would fill the form.
  // Three coarse updates preserve the story without re-rendering for every
  // character throughout every loop.
  const [filledFields, setFilledFields] = useState(0);
  const typedValues = [
    DEMO_NEW_EXPENSE.label,
    DEMO_NEW_EXPENSE.amount,
    DEMO_NEW_EXPENSE.paidBy,
  ];

  useEffect(() => {
    if (!showForm) {
      setFilledFields(0);
      return undefined;
    }

    const timers = [350, 700, 1050].map((delay, index) =>
      setTimeout(() => setFilledFields(index + 1), delay),
    );

    return () => timers.forEach(clearTimeout);
  }, [showForm]);

  const typedValue = (valueIndex: number) =>
    filledFields > valueIndex ? typedValues[valueIndex] : "";
  const expenseReady = filledFields === typedValues.length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Expenses
        </Typography>
        <Chip
          icon={<GroupsIcon />}
          label={DEMO_SELECTED_GROUP}
          size="small"
          sx={{ height: 20, fontSize: "0.65rem" }}
        />
      </Box>

      {showForm && (
        <Fade in appear timeout={300}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 0.5 }}>
          <TextField
            label="Description"
            value={typedValue(0)}
            size="small"
            variant="outlined"
            disabled
            fullWidth
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 1.25,
              // Give the floating Amount/Paid by labels clear air below the
              // Description outline without increasing the preview frame.
              mt: 0.75,
            }}
          >
            <TextField
              label="Amount"
              value={typedValue(1)}
              size="small"
              variant="outlined"
              disabled
              fullWidth
            />
            <TextField
              label="Paid by"
              value={typedValue(2)}
              size="small"
              variant="outlined"
              disabled
              fullWidth
            />
          </Box>
          <Button
            variant="contained"
            size="small"
            disabled
            sx={{
              alignSelf: "flex-start",
              transition: "background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease",
              ...(expenseReady && {
                "&.Mui-disabled": {
                  bgcolor: "primary.main",
                  color: "common.white",
                  boxShadow: 2,
                },
              }),
            }}
          >
            Add Expense
          </Button>
          </Box>
        </Fade>
      )}

      <Grow in={showNewExpense} unmountOnExit>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "background.default",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            px: 1.25,
            py: 0.75,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {DEMO_NEW_EXPENSE.label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {DEMO_NEW_EXPENSE.amount}
          </Typography>
        </Box>
      </Grow>

      {/* Hidden while the form is open: the real list underneath the form
          isn't the point of this step and dropping it keeps the form step
          from being the tallest one in the loop, so the whole card doesn't
          have to reserve extra height it only needs a third of the time. */}
      {!showForm &&
        DEMO_BASE_EXPENSES.map((expense) => (
          <Box
            key={expense.label}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              px: 1.25,
              py: 0.75,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {expense.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {expense.amount}
            </Typography>
          </Box>
        ))}

      {!showForm && (
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          disabled
          sx={{ alignSelf: "flex-start", mt: 0.25 }}
        >
          Add Expense
        </Button>
      )}
    </Box>
  );
};

export const SettlementsScreen: React.FC = () => (
  <Box
    sx={{
      bgcolor: "background.paper",
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 2,
      overflow: "hidden",
    }}
  >
    {DEMO_SETTLEMENTS.map((settlement, index) => (
      <Box
        key={`${settlement.ower}-${settlement.owee}`}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1.25,
          borderTop: index === 0 ? "none" : "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {settlement.ower}
        </Typography>
        <ArrowForwardIcon fontSize="small" sx={{ color: "text.secondary" }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {settlement.owee}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
          {settlement.amount}
        </Typography>
      </Box>
    ))}
  </Box>
);

export const TotalsScreen: React.FC = () => (
  <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
    <CardContent sx={{ p: "12px !important" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box
          sx={{
            bgcolor: "primary.light",
            color: "primary.main",
            p: 0.75,
            borderRadius: 2,
            display: "flex",
          }}
        >
          <GroupsIcon fontSize="small" />
        </Box>
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textTransform: "uppercase", fontWeight: 600, fontSize: "0.65rem" }}
          >
            Group
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {DEMO_SELECTED_GROUP}
          </Typography>
        </Box>
      </Box>

      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", fontWeight: 600, fontSize: "0.65rem" }}
      >
        Total Spending
      </Typography>
      <Box sx={{ p: 1, bgcolor: "grey.50", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.25 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "primary.main" }} />
          <Typography variant="caption" color="text.secondary">
            {DEMO_CURRENCY}
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ fontWeight: 700, color: "success.dark" }}>
          {DEMO_TOTAL}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);
