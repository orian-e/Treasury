import { Expense, User, hasMultiplePayers, getExpensePayers } from "../models/Users";

export type BalancesByUser = Record<string, number>;

export const computeBalancesForCurrency = (
  users: User[],
  expenses: Expense[]
): BalancesByUser => {
  // Create a map of user IDs to ensure we only process valid users
  const validUserIds = new Set(users.filter(u => u && u.id).map(u => u.id));
  const balances: BalancesByUser = {};
  
  // Initialize balances for all valid users
  validUserIds.forEach(userId => {
    balances[userId] = 0;
  });

  expenses.forEach((expense) => {
    // Handle both single and multiple payers
    if (hasMultiplePayers(expense)) {
      // For multiple payers, each payer's contribution is their paid amount
      expense.payers?.forEach(payer => {
        if (validUserIds.has(payer.userId)) {
          balances[payer.userId] += payer.amount;
        }
      });
    } else {
      // For backward compatibility with single payer
      const payerId = expense.payerId;
      if (payerId && validUserIds.has(payerId)) {
        balances[payerId] += expense.amount;
      }
    }

    // Deduct each user's share from their balance
    expense.splits.forEach(split => {
      if (validUserIds.has(split.userId)) {
        balances[split.userId] -= split.amount;
      }
    });
  });

  return balances;
};

export interface SettlementTx {
  from: string;
  to: string;
  amount: number;
}

export const computeSettlements = (
  balances: BalancesByUser,
  users: User[] = []
): SettlementTx[] => {  
  // Filter out any invalid or zero balances first
  const nonZeroBalances = Object.entries(balances).filter(([_, amount]) => 
    Math.abs(amount) > 0.01 // Ignore very small amounts due to floating point imprecision
  );

  // Create a set of valid user IDs if users array is provided
  const validUserIds = users.length > 0 
    ? new Set(users.filter(u => u && u.id).map(u => u.id))
    : null;

  // Filter out any invalid user IDs if we have the users list
  const filterValidUsers = (entries: [string, number][]) => {
    if (!validUserIds) return entries;
    return entries.filter(([id]) => validUserIds.has(id));
  };

  // Sort balances to process largest debts and credits first (more efficient settlement)
  const sortedBalances = filterValidUsers(nonZeroBalances).sort((a, b) => b[1] - a[1]);
  
  // People who are owed money (positive balance)
  const creditors = sortedBalances
    .filter(([, bal]) => bal > 0.01) // Only include significant positive balances
    .map(([id, bal]) => ({ id, amount: bal }));
  
  // People who owe money (negative balance)
  const debtors = [...sortedBalances]
    .filter(([, bal]) => bal < -0.01) // Only include significant negative balances
    .map(([id, bal]) => ({ id, amount: Math.abs(bal) }));
    
  // If we have debtors but no creditors, it means everyone is in debt to the group
  // In this case, we need to find who owes the most and make them a creditor for the total
  if (debtors.length > 0 && creditors.length === 0) {
    // Calculate total debt
    const totalDebt = debtors.reduce((sum, debtor) => sum + debtor.amount, 0);
    
    // Find the person who owes the most (farthest from zero)
    const maxDebtor = debtors.reduce((max, debtor) => 
      debtor.amount > max.amount ? debtor : max, debtors[0]);
    
    // Move them to creditors with the total debt amount
    const creditorIndex = debtors.findIndex(d => d.id === maxDebtor.id);
    if (creditorIndex !== -1) {
      debtors.splice(creditorIndex, 1);
      creditors.push({ id: maxDebtor.id, amount: totalDebt });
    }
  }

  const settlements: SettlementTx[] = [];
  
  // Process each debtor and match with creditors
  for (let i = 0; i < debtors.length; i++) {
    const debtor = debtors[i];
    if (debtor.amount < 0.01) continue;
    
    // Find a creditor to settle with
    for (let j = 0; j < creditors.length; j++) {
      const creditor = creditors[j];
      if (creditor.amount < 0.01) continue;
      
      const amount = Math.min(debtor.amount, creditor.amount);
      if (amount < 0.01) continue;
      
      // Add the settlement (debtor pays creditor)
      settlements.push({
        from: debtor.id,      // Person who owes money (debtor)
        to: creditor.id,      // Person being paid (creditor)
        amount: parseFloat(amount.toFixed(2)) // Ensure clean decimal places
      });
      
      // Update the amounts
      debtor.amount -= amount;
      creditor.amount -= amount;
      
      if (debtor.amount < 0.01) break;
    }
  }
  
  return settlements;
};

export const computeAllSettlements = (
  users: User[],
  expensesByCurrency: Record<string, Expense[]>
): Record<string, SettlementTx[]> => {
  const allSettlements: Record<string, SettlementTx[]> = {};
  
  // Process each currency separately
  Object.entries(expensesByCurrency).forEach(([currency, expenses]) => {
    // Skip if no expenses for this currency
    if (expenses.length === 0) return;
    
    // Compute balances for this currency
    const balances = computeBalancesForCurrency(users, expenses);
    
    // Compute settlements for this currency
    const settlements = computeSettlements(balances, users);
    
    // Only add if we have settlements
    if (settlements.length > 0) {
      allSettlements[currency] = settlements;
    }
  });
  
  return allSettlements;
};
