export interface Split {
  userId: string; // or name/email
  amount: number;
}

export interface Payer {
  userId: string;
  amount: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  // For backward compatibility - will be used if payers is not set
  payerId?: string;
  // New field for multiple payers
  payers?: Payer[];
  splits: Split[];
  groupId: string | null;
}

// Helper type to check if an expense uses the new multi-payer format
export function hasMultiplePayers(expense: Expense): boolean {
  return !!expense.payers && expense.payers.length > 0;
}

// Helper to get all payers in a consistent format
export function getExpensePayers(expense: Expense): Payer[] {
  if (hasMultiplePayers(expense)) {
    return expense.payers!;
  }
  return expense.payerId ? [{ userId: expense.payerId, amount: expense.amount }] : [];
}

export interface User {
  id: string;
  name: string;
  email?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  inviteCode?: string;
  creatorId: string;
  createdAt: string;
}

export const defaultUsers: User[] = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
  { id: "3", name: "Charlie" },
];
