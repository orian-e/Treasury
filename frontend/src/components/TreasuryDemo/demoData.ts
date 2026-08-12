// Hardcoded fixtures for the decorative homepage preview. No relation to
// real app state — see HOMEPAGE_DEMO_PLAN.md for the constraints this
// component tree has to hold to.

export type DemoStep =
  | "groups"
  | "groupSelected"
  | "expenses"
  | "expenseForm"
  | "expenseSaved"
  | "settlements"
  | "totals";

export const STEP_SEQUENCE: DemoStep[] = [
  "groups",
  "groupSelected",
  "expenses",
  "expenseForm",
  "expenseSaved",
  "settlements",
  "totals",
];

// Milliseconds to hold each step before advancing. groupSelected runs longer
// than the others: it's the "aha" beat where picking a group visibly unlocks
// Expenses/Settlements, so it gets extra dwell time to read as cause-and-
// effect rather than a jump-cut. Sums to ~11.9s per loop, still in the
// 10-15s range the demo is meant to run at.
export const STEP_DURATIONS: Record<DemoStep, number> = {
  groups: 1600,
  groupSelected: 1600,
  expenses: 1700,
  expenseForm: 1900,
  expenseSaved: 1500,
  settlements: 1900,
  totals: 1700,
};

// Which nav tab (matches MainApp's real Groups/Expenses/Settlements/Totals
// order) reads as active for a given step.
export const ACTIVE_TAB_BY_STEP: Record<DemoStep, number> = {
  groups: 0,
  groupSelected: 0,
  expenses: 1,
  expenseForm: 1,
  expenseSaved: 1,
  settlements: 2,
  totals: 3,
};

// Deliberately distinct from backend/scripts/seed.ts fixtures (e.g. its real
// "Flatmates" group, "Dinner at ..." / "Internet subscription" expenses) so
// no e2e getByText locator could ever collide with this decorative copy,
// even outside the current HomePage/MainApp mutual-exclusion that already
// keeps them apart.
export const DEMO_GROUPS = ["Weekend Trip", "Roomies", "Family"] as const;
export const DEMO_SELECTED_GROUP = "Roomies";

// Amounts formatted like utils/currencies.ts#formatCurrency (symbol + 2dp),
// hardcoded rather than imported so this stays a plain data file.
export const DEMO_BASE_EXPENSES = [
  { label: "Groceries", amount: "€32.00" },
  { label: "Streaming", amount: "€35.00" },
] as const;

export const DEMO_NEW_EXPENSE = {
  label: "Takeout",
  amount: "€48.00",
  paidBy: "Alice",
} as const;

// Two rows rather than one: mirrors SettlementPanel's real list layout and
// gives the Settlements frame enough content to fill the preview instead of
// sitting mostly blank around a single line.
export const DEMO_SETTLEMENTS = [
  { ower: "Bob", owee: "Alice", amount: "€24.00" },
  { ower: "Charlie", owee: "Alice", amount: "€9.00" },
] as const;

export const DEMO_CURRENCY = "EUR";
export const DEMO_TOTAL = "€115.00";
