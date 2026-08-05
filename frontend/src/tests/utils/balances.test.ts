import {
  computeBalancesForCurrency,
  computeSettlements,
  computeAllSettlements,
  BalancesByUser,
} from "../../utils/balances";
import { Expense, User } from "../../models/Users";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeUser = (id: string, name: string): User => ({
  id,
  name,
  email: `${name.toLowerCase()}@test.com`,
  groupIds: ["g1"],
});

const alice = makeUser("1", "Alice");
const bob = makeUser("2", "Bob");
const charlie = makeUser("3", "Charlie");

/** Shorthand: single-payer expense (backward compat format using payerId) */
function singlePayerExpense(overrides: Partial<Expense> & { payerId: string; splits: { userId: string; amount: number }[]; amount: number }): Expense {
  return {
    id: Math.random().toString(36).slice(2),
    description: "Test",
    currency: "EUR",
    date: "2025-01-01T00:00:00.000Z",
    groupId: "g1",
    ...overrides,
  };
}

/** Shorthand: multi-payer expense (uses payers array) */
function multiPayerExpense(overrides: Partial<Expense> & { payers: { userId: string; amount: number }[]; splits: { userId: string; amount: number }[]; amount: number }): Expense {
  return {
    id: Math.random().toString(36).slice(2),
    description: "Test",
    currency: "EUR",
    date: "2025-01-01T00:00:00.000Z",
    groupId: "g1",
    ...overrides,
  };
}

// ─── computeBalancesForCurrency ───────────────────────────────────────────────

describe("computeBalancesForCurrency", () => {
  it("should return zero balances when there are no expenses", () => {
    const balances = computeBalancesForCurrency([alice, bob], []);
    expect(balances).toEqual({ "1": 0, "2": 0 });
  });

  it("should calculate correctly for single payer, equal split between 2", () => {
    // Alice pays 100, split equally: Alice 50, Bob 50
    const expenses = [
      singlePayerExpense({
        amount: 100,
        payerId: "1",
        splits: [
          { userId: "1", amount: 50 },
          { userId: "2", amount: 50 },
        ],
      }),
    ];

    const balances = computeBalancesForCurrency([alice, bob], expenses);
    expect(balances["1"]).toBeCloseTo(50);   // Alice is owed 50
    expect(balances["2"]).toBeCloseTo(-50);  // Bob owes 50
  });

  it("should calculate correctly for single payer, equal split between 3", () => {
    // Alice pays 90, split equally: each owes 30
    const expenses = [
      singlePayerExpense({
        amount: 90,
        payerId: "1",
        splits: [
          { userId: "1", amount: 30 },
          { userId: "2", amount: 30 },
          { userId: "3", amount: 30 },
        ],
      }),
    ];

    const balances = computeBalancesForCurrency([alice, bob, charlie], expenses);
    expect(balances["1"]).toBeCloseTo(60);   // Alice is owed 60 (paid 90 - her share 30)
    expect(balances["2"]).toBeCloseTo(-30);  // Bob owes 30
    expect(balances["3"]).toBeCloseTo(-30);  // Charlie owes 30
  });

  it("should handle custom (unequal) splits correctly", () => {
    // Bob pays 120, custom split: Alice 55, Bob 35, Charlie 30
    const expenses = [
      singlePayerExpense({
        amount: 120,
        payerId: "2",
        splits: [
          { userId: "1", amount: 55 },
          { userId: "2", amount: 35 },
          { userId: "3", amount: 30 },
        ],
      }),
    ];

    const balances = computeBalancesForCurrency([alice, bob, charlie], expenses);
    expect(balances["1"]).toBeCloseTo(-55);  // Alice owes 55
    expect(balances["2"]).toBeCloseTo(85);   // Bob is owed 85 (paid 120 - his share 35)
    expect(balances["3"]).toBeCloseTo(-30);  // Charlie owes 30
  });

  it("should result in settled up when payer pays only for themselves", () => {
    // Alice pays 50, only she is in the split
    const expenses = [
      singlePayerExpense({
        amount: 50,
        payerId: "1",
        splits: [{ userId: "1", amount: 50 }],
      }),
    ];

    const balances = computeBalancesForCurrency([alice, bob], expenses);
    expect(balances["1"]).toBeCloseTo(0);  // Alice is settled up
    expect(balances["2"]).toBeCloseTo(0);  // Bob is settled up (not involved)
  });

  it("should handle multi-payer expenses correctly", () => {
    // Alice pays 60, Bob pays 40 (total 100), split equally: each 50
    const expenses = [
      multiPayerExpense({
        amount: 100,
        payers: [
          { userId: "1", amount: 60 },
          { userId: "2", amount: 40 },
        ],
        splits: [
          { userId: "1", amount: 50 },
          { userId: "2", amount: 50 },
        ],
      }),
    ];

    const balances = computeBalancesForCurrency([alice, bob], expenses);
    expect(balances["1"]).toBeCloseTo(10);   // Alice is owed 10 (paid 60 - share 50)
    expect(balances["2"]).toBeCloseTo(-10);  // Bob owes 10 (paid 40 - share 50)
  });

  it("should handle multi-payer with 3-way split correctly", () => {
    // Alice pays 150, Bob pays 30 (total 180), split: Alice 60, Bob 60, Charlie 60
    const expenses = [
      multiPayerExpense({
        amount: 180,
        payers: [
          { userId: "1", amount: 150 },
          { userId: "2", amount: 30 },
        ],
        splits: [
          { userId: "1", amount: 60 },
          { userId: "2", amount: 60 },
          { userId: "3", amount: 60 },
        ],
      }),
    ];

    const balances = computeBalancesForCurrency([alice, bob, charlie], expenses);
    expect(balances["1"]).toBeCloseTo(90);   // Alice: paid 150, owes 60 → +90
    expect(balances["2"]).toBeCloseTo(-30);  // Bob: paid 30, owes 60 → -30
    expect(balances["3"]).toBeCloseTo(-60);  // Charlie: paid 0, owes 60 → -60
  });

  it("should accumulate balances across multiple expenses", () => {
    // Expense 1: Alice pays 60, split equally (30 each)
    // Expense 2: Bob pays 40, split equally (20 each)
    const expenses = [
      singlePayerExpense({
        amount: 60,
        payerId: "1",
        splits: [
          { userId: "1", amount: 30 },
          { userId: "2", amount: 30 },
        ],
      }),
      singlePayerExpense({
        amount: 40,
        payerId: "2",
        splits: [
          { userId: "1", amount: 20 },
          { userId: "2", amount: 20 },
        ],
      }),
    ];

    const balances = computeBalancesForCurrency([alice, bob], expenses);
    // Alice: +60 -30 -20 = +10
    // Bob:   +40 -30 -20 = -10
    expect(balances["1"]).toBeCloseTo(10);
    expect(balances["2"]).toBeCloseTo(-10);
  });

  it("should handle expenses that cancel out (everyone settled up)", () => {
    // Alice pays 100 split equally, then Bob pays 100 split equally
    const expenses = [
      singlePayerExpense({
        amount: 100,
        payerId: "1",
        splits: [
          { userId: "1", amount: 50 },
          { userId: "2", amount: 50 },
        ],
      }),
      singlePayerExpense({
        amount: 100,
        payerId: "2",
        splits: [
          { userId: "1", amount: 50 },
          { userId: "2", amount: 50 },
        ],
      }),
    ];

    const balances = computeBalancesForCurrency([alice, bob], expenses);
    expect(balances["1"]).toBeCloseTo(0);
    expect(balances["2"]).toBeCloseTo(0);
  });

  it("should handle floating point precision (e.g. 100 / 3)", () => {
    // Alice pays 100, split among 3 people: 33.33 + 33.33 + 33.34
    const expenses = [
      singlePayerExpense({
        amount: 100,
        payerId: "1",
        splits: [
          { userId: "1", amount: 33.33 },
          { userId: "2", amount: 33.33 },
          { userId: "3", amount: 33.34 },
        ],
      }),
    ];

    const balances = computeBalancesForCurrency([alice, bob, charlie], expenses);
    expect(balances["1"]).toBeCloseTo(66.67, 1);
    expect(balances["2"]).toBeCloseTo(-33.33, 1);
    expect(balances["3"]).toBeCloseTo(-33.34, 1);
    // Sum of all balances should be ~0
    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(0, 1);
  });

  it("should ignore users not in the users array", () => {
    // Expense split includes user "99" who isn't in our users array
    const expenses = [
      singlePayerExpense({
        amount: 100,
        payerId: "1",
        splits: [
          { userId: "1", amount: 50 },
          { userId: "99", amount: 50 },
        ],
      }),
    ];

    const balances = computeBalancesForCurrency([alice], expenses);
    // Alice paid 100 but only her split (50) is processed since "99" is unknown
    expect(balances["1"]).toBeCloseTo(50);
    expect(balances["99"]).toBeUndefined();
  });

  it("should handle single member group (always settled up)", () => {
    const expenses = [
      singlePayerExpense({
        amount: 50,
        payerId: "1",
        splits: [{ userId: "1", amount: 50 }],
      }),
      singlePayerExpense({
        amount: 25,
        payerId: "1",
        splits: [{ userId: "1", amount: 25 }],
      }),
    ];

    const balances = computeBalancesForCurrency([alice], expenses);
    expect(balances["1"]).toBeCloseTo(0);
  });
});

// ─── computeSettlements ──────────────────────────────────────────────────────

describe("computeSettlements", () => {
  it("should return no settlements when all balances are zero", () => {
    const balances: BalancesByUser = { "1": 0, "2": 0, "3": 0 };
    const settlements = computeSettlements(balances, [alice, bob, charlie]);
    expect(settlements).toHaveLength(0);
  });

  it("should produce a single settlement for 2 users", () => {
    // Alice is owed 50, Bob owes 50
    const balances: BalancesByUser = { "1": 50, "2": -50 };
    const settlements = computeSettlements(balances, [alice, bob]);
    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual({ from: "2", to: "1", amount: 50 });
  });

  it("should produce correct settlements for 3 users", () => {
    // Alice is owed 60, Bob owes 30, Charlie owes 30
    const balances: BalancesByUser = { "1": 60, "2": -30, "3": -30 };
    const settlements = computeSettlements(balances, [alice, bob, charlie]);

    // Total amount settled should equal 60
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(totalSettled).toBeCloseTo(60);

    // Alice should receive from both Bob and Charlie
    const toAlice = settlements.filter(s => s.to === "1");
    expect(toAlice.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle near-zero balances (floating point)", () => {
    // Balances that are effectively zero due to floating point
    const balances: BalancesByUser = { "1": 0.001, "2": -0.001 };
    const settlements = computeSettlements(balances, [alice, bob]);
    expect(settlements).toHaveLength(0); // Should be ignored due to < 0.01 threshold
  });

  it("should produce clean decimal amounts", () => {
    const balances: BalancesByUser = { "1": 33.33, "2": -33.33 };
    const settlements = computeSettlements(balances, [alice, bob]);
    expect(settlements).toHaveLength(1);
    expect(settlements[0].amount).toBe(33.33);
  });

  it("should handle multiple debtors paying one creditor", () => {
    // Alice is owed 100, Bob owes 60, Charlie owes 40
    const balances: BalancesByUser = { "1": 100, "2": -60, "3": -40 };
    const settlements = computeSettlements(balances, [alice, bob, charlie]);

    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(totalSettled).toBeCloseTo(100);

    // Everyone that pays should pay to Alice
    settlements.forEach(s => {
      expect(s.to).toBe("1");
    });
  });
});

// ─── computeAllSettlements ───────────────────────────────────────────────────

describe("computeAllSettlements", () => {
  it("should compute settlements per currency independently", () => {
    const users = [alice, bob];
    const expensesByCurrency: Record<string, Expense[]> = {
      EUR: [
        singlePayerExpense({
          amount: 100,
          currency: "EUR",
          payerId: "1",
          splits: [
            { userId: "1", amount: 50 },
            { userId: "2", amount: 50 },
          ],
        }),
      ],
      USD: [
        singlePayerExpense({
          amount: 80,
          currency: "USD",
          payerId: "2",
          splits: [
            { userId: "1", amount: 40 },
            { userId: "2", amount: 40 },
          ],
        }),
      ],
    };

    const allSettlements = computeAllSettlements(users, expensesByCurrency);

    // EUR: Bob owes Alice 50
    expect(allSettlements["EUR"]).toHaveLength(1);
    expect(allSettlements["EUR"][0]).toEqual({ from: "2", to: "1", amount: 50 });

    // USD: Alice owes Bob 40
    expect(allSettlements["USD"]).toHaveLength(1);
    expect(allSettlements["USD"][0]).toEqual({ from: "1", to: "2", amount: 40 });
  });

  it("should omit currencies where everyone is settled up", () => {
    const users = [alice, bob];
    const expensesByCurrency: Record<string, Expense[]> = {
      EUR: [
        singlePayerExpense({
          amount: 100,
          currency: "EUR",
          payerId: "1",
          splits: [{ userId: "1", amount: 100 }], // Alice pays for herself
        }),
      ],
    };

    const allSettlements = computeAllSettlements(users, expensesByCurrency);
    expect(allSettlements["EUR"]).toBeUndefined(); // No settlements needed
  });

  it("should skip empty expense arrays", () => {
    const allSettlements = computeAllSettlements([alice, bob], { EUR: [] });
    expect(Object.keys(allSettlements)).toHaveLength(0);
  });
});
