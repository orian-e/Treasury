import { User, Group, Expense } from "../../models/Users";

// Snapshot of the seed data for frontend testing
export const seedUsers: User[] = [
  { id: "u1", name: "Alice Martin", email: "alice@example.com" },
  { id: "u2", name: "Bob Chen", email: "bob@example.com" },
  { id: "u3", name: "Clara Fernández", email: "clara@example.com" },
  { id: "u9", name: "נועה כהן", email: "noa@example.com" }, // Hebrew Name
  { id: "g_trip", name: "Luis (Guide)" }, // Guest
];

const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

export const seedGroups: Group[] = [
  { id: "g1", name: "Flatmates 🏠", description: "Day-to-day shared flat expenses", creatorId: "u1", inviteCode: "FLAT123", createdAt: daysAgo(100) },
  { id: "g2", name: "Trip to Barcelona ✈️", description: "Our Barcelona adventure", creatorId: "u2", inviteCode: "TRIP123", createdAt: daysAgo(50) },
  { id: "g5", name: "ארוחות משפחתיות 🍽️", description: "הוצאות משותפות למשפחה", creatorId: "u9", inviteCode: "FAM123", createdAt: daysAgo(10) }, // Hebrew Group
];

export const seedExpenses: Expense[] = [
  {
    id: "e1",
    description: "Weekly groceries",
    amount: 87.6,
    currency: "EUR",
    date: daysAgo(5),
    groupId: "g1",
    payerId: "u1", // Backward compat
    payers: [{ userId: "u1", amount: 87.6 }],
    splits: [
      { userId: "u1", amount: 21.9 },
      { userId: "u2", amount: 21.9 },
      { userId: "u3", amount: 21.9 },
      { userId: "u9", amount: 21.9 },
    ],
  },
  {
    id: "e2",
    description: "IKEA order (UK warehouse)",
    amount: 189,
    currency: "GBP",
    date: daysAgo(25),
    groupId: "g1",
    payerId: "u2", // Bob pays in GBP
    payers: [{ userId: "u2", amount: 189 }],
    splits: [
      { userId: "u1", amount: 47.25 },
      { userId: "u2", amount: 47.25 },
      { userId: "u3", amount: 47.25 },
      { userId: "u9", amount: 47.25 },
    ],
  },
  {
    id: "e3",
    description: "ארוחת ערב משותפת — Shared dinner",
    amount: 96,
    currency: "EUR",
    date: daysAgo(2),
    groupId: "g1",
    payerId: "u9", // Hebrew payer
    payers: [{ userId: "u9", amount: 96 }],
    splits: [
      { userId: "u1", amount: 24 },
      { userId: "u2", amount: 24 },
      { userId: "u3", amount: 24 },
      { userId: "u9", amount: 24 },
    ],
  },
  {
    id: "e4",
    description: "Group flights — Ryanair",
    amount: 480,
    currency: "GBP",
    date: daysAgo(45),
    groupId: "g2",
    payerId: "u1", // Multiple payers actually, we use payers array
    payers: [
      { userId: "u1", amount: 300 },
      { userId: "u2", amount: 180 },
    ],
    splits: [
      { userId: "u1", amount: 120 },
      { userId: "u2", amount: 120 },
      { userId: "u3", amount: 120 },
      { userId: "g_trip", amount: 120 },
    ],
  }
];

export const mockFetchResponse = (data: any) => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data)
  } as Response);
};
