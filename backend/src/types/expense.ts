export interface Split {
  userId: string;
  amount: number;
  type?: "equal" | "percentage" | "custom";
  percentage?: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  payerId: string;
  splits: Split[];
  groupId?: string;
}

export interface ExpenseRequest {
  description: string;
  amount: number;
  date: Date;
  payerId: string;
  splits: Split[];
  groupId?: string;
}
