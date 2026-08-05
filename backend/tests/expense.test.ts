// backend/tests/expense.test.ts
import request from "supertest";
import express from "express";
import { setExpenseRoutes } from "../src/routes/expenseRoutes";
import { setAuthRoutes } from "../src/routes/authRoutes";
import { setGroupRoutes } from "../src/routes/groupRoutes";
import { setUserRoutes } from "../src/routes/userRoutes";
import mongoose from 'mongoose';
import User from "../src/models/usersModel";

const app = express();
app.use(express.json());

setAuthRoutes(app);
setGroupRoutes(app);
setExpenseRoutes(app);
setUserRoutes(app);

describe("Expense API", () => {
  let authToken: string;
  let authToken2: string;
  let groupId: string;
  let userId: string;
  let userId2: string;
  let expenseId: string;
  let expenseIds: string[] = [];

  beforeAll(async () => {
    // Clear any existing test data (use deleteMany instead of dropDatabase for safety)
    await mongoose.connection.db!.collection("users").deleteMany({});
    await mongoose.connection.db!.collection("groups").deleteMany({});
    await mongoose.connection.db!.collection("expenses").deleteMany({});

    // Register first user
    const registerRes = await request(app).post("/auth/register").send({
      name: "Expense Test User",
      email: "expensetest@example.com",
      password: "123456",
    });

    authToken = registerRes.body.token;
    userId = registerRes.body.user.id;

    // Register second user
    const registerRes2 = await request(app).post("/auth/register").send({
      name: "Expense Test User 2",
      email: "expensetest2@example.com",
      password: "123456",
    });

    authToken2 = registerRes2.body.token;
    userId2 = registerRes2.body.user.id;

    // Create group
    const groupRes = await request(app)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ 
        name: "Expense Test Group", 
        description: "Test Description",
        memberEmails: ["expensetest2@example.com"]
      });

    groupId = groupRes.body.id;
  });

  describe("Expense Creation", () => {
    it("should create expense with valid data", async () => {
      const expenseData = {
        description: "Test Expense",
        amount: 100.5,
        date: new Date().toISOString(),
        payerId: userId,
        splits: [{ userId, amount: 100.5 }],
        groupId,
      };

      const res = await request(app)
        .post("/expenses")
        .set("Authorization", `Bearer ${authToken}`)
        .send(expenseData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.description).toBe("Test Expense");
      expect(res.body.amount).toBe(100.5);
      expect(res.body.groupId).toBe(groupId);
      expect(res.body.currency).toBe("EUR");

      expenseId = res.body.id;
      expenseIds.push(expenseId);
    });

    it("should fail without groupId", async () => {
      const expenseData = {
        description: "Test Expense",
        amount: 100.5,
        date: new Date().toISOString(),
        payerId: userId,
        splits: [{ userId, amount: 100.5 }],
      };

      const res = await request(app)
        .post("/expenses")
        .set("Authorization", `Bearer ${authToken}`)
        .send(expenseData);

      expect(res.statusCode).toBe(400);
    });

    it("should create expense with multiple payers", async () => {
      const expenseData = {
        description: "Multi-payer Expense",
        amount: 150,
        date: new Date().toISOString(),
        payers: [
          { userId, amount: 100 },
          { userId: userId2, amount: 50 }
        ],
        splits: [
          { userId, amount: 100 },
          { userId: userId2, amount: 50 }
        ],
        groupId,
        splitType: "custom"
      };

      const res = await request(app)
        .post("/expenses")
        .set("Authorization", `Bearer ${authToken}`)
        .send(expenseData);

      expect(res.statusCode).toBe(201);
      expect(res.body.payers).toHaveLength(2);
      expect(res.body.splits).toHaveLength(2);
      expect(res.body.splitType).toBe("custom");
      
      const payer1 = res.body.payers.find((p: any) => p.userId === userId);
      const payer2 = res.body.payers.find((p: any) => p.userId === userId2);
      
      expect(payer1.amount).toBe(100);
      expect(payer2.amount).toBe(50);
      
      expenseIds.push(res.body.id);
    });



    it("should create expense with percentage split type", async () => {
      const expenseData = {
        description: "Percentage Split Expense",
        amount: 200,
        date: new Date().toISOString(),
        payers: [
          { userId, amount: 200, percentage: 100, type: 'percentage' }
        ],
        splits: [
          { userId, amount: 140, percentage: 70 },
          { userId: userId2, amount: 60, percentage: 30 }
        ],
        groupId,
        splitType: "percentage"
      };

      const res = await request(app)
        .post("/expenses")
        .set("Authorization", `Bearer ${authToken}`)
        .send(expenseData);

      expect(res.statusCode).toBe(201);
      expect(res.body.splitType).toBe("percentage");
      expect(res.body.splits).toHaveLength(2);
      
      const split1 = res.body.splits.find((s: any) => s.userId === userId);
      const split2 = res.body.splits.find((s: any) => s.userId === userId2);
      
      expect(split1.percentage).toBe(70);
      expect(split2.percentage).toBe(30);
      expect(Number(split1.amount) + Number(split2.amount)).toBeCloseTo(200);
      
      expenseIds.push(res.body.id);
    });

    it("should fail with invalid splits", async () => {
      const expenseData = {
        description: "Test Expense",
        amount: 100.5,
        date: new Date().toISOString(),
        payers: [{ userId, amount: 100.5 }],
        splits: [{ userId, amount: 50.25 }], // Doesn't match total
        groupId,
      };

      const res = await request(app)
        .post("/expenses")
        .set("Authorization", `Bearer ${authToken}`)
        .send(expenseData);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Total owed by all participants");
    });

    it("should fail with invalid percentage splits", async () => {
      const expenseData = {
        description: "Invalid Percentage Test",
        amount: 100,
        date: new Date().toISOString(),
        payers: [
          { userId, amount: 100, percentage: 100, type: 'percentage' }
        ],
        splits: [
          { userId, amount: 60, percentage: 60 },
          { userId: userId2, amount: 30, percentage: 30 },
        ],
        groupId,
        splitType: "percentage"
      };

      const res = await request(app)
        .post("/expenses")
        .set("Authorization", `Bearer ${authToken}`)
        .send(expenseData);

      expect(res.statusCode).toBe(400);
      // Check for either error message since the controller might return different ones
      expect([
        "Total percentage must be 100",
        "Total owed by all participants (90.00) must equal expense amount (100.00)"
      ]).toContain(res.body.error);
    });

    it("should fail with invalid payer amounts", async () => {
      const expenseData = {
        description: "Invalid Payer Amounts",
        amount: 100,
        date: new Date().toISOString(),
        payers: [
          { userId, amount: 60 },
          { userId: userId2, amount: 30 } // Total is 90, should be 100
        ],
        splits: [
          { userId, amount: 50 },
          { userId: userId2, amount: 50 }
        ],
        groupId,
        splitType: "custom"
      };

      const res = await request(app)
        .post("/expenses")
        .set("Authorization", `Bearer ${authToken}`)
        .send(expenseData);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Total paid by all payers");
    });



  });




  describe("PUT /expenses/:id", () => {
    it("should update expense with multipayer data", async () => {
      // First create an expense to update
      const createRes = await request(app)
        .post("/expenses")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: "Expense to Update",
          amount: 100,
          date: new Date().toISOString(),
          payerId: userId,
          splits: [{ userId, amount: 100 }],
          groupId,
        });
      
      const expenseToUpdateId = createRes.body.id;
      expenseIds.push(expenseToUpdateId);

      // Update to multipayer
      const updateData = {
        description: "Updated to Multipayer",
        amount: 200,
        date: new Date().toISOString(),
        payers: [
          { userId, amount: 150 },
          { userId: userId2, amount: 50 }
        ],
        splits: [
          { userId, amount: 150 },
          { userId: userId2, amount: 50 }
        ],
        groupId,
        splitType: "custom"
      };

      const res = await request(app)
        .put(`/expenses/${expenseToUpdateId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.description).toBe("Updated to Multipayer");
      expect(res.body.amount).toBe(200);
      expect(res.body.payers).toHaveLength(2);
      expect(res.body.splits).toHaveLength(2);
      expect(res.body.splitType).toBe("custom");
    });

    it("should update split type and recalculate amounts", async () => {
      // Create an expense with custom split
      const createRes = await request(app)
        .post("/expenses")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          description: "Expense to Update Split Type",
          amount: 100,
          date: new Date().toISOString(),
          payers: [{ userId, amount: 100 }],
          splits: [
            { userId, amount: 60 },
            { userId: userId2, amount: 40 }
          ],
          groupId,
          splitType: "custom"
        });
      
      const expenseId = createRes.body.id;
      expenseIds.push(expenseId);

      // Update to equal split - need to provide the full expense data
      const updateData = {
        description: "Expense to Update Split Type - Updated",
        amount: 100,
        date: new Date().toISOString(),
        payers: [{ userId, amount: 100 }],
        splits: [
          { userId, amount: 50 },
          { userId: userId2, amount: 50 }
        ],
        splitType: "equal",
        groupId
      };

      const res = await request(app)
        .put(`/expenses/${expenseId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.splitType).toBe("equal");
      expect(res.body.description).toBe("Expense to Update Split Type - Updated");
      
      // Since we don't have a direct GET /expenses/:id endpoint, we'll verify the update
      // by checking the response from the PUT request
      expect(res.body.splitType).toBe("equal");
      
      // The response should include the updated splits
      const splits = res.body.splits || [];
      expect(splits.length).toBeGreaterThanOrEqual(2);
      
      const split1 = splits.find((s: any) => s.userId === userId);
      const split2 = splits.find((s: any) => s.userId === userId2);
      
      // Check that the amounts are roughly equal (allowing for floating point precision)
      if (split1 && split2) {
        const totalSplitAmount = Number(split1.amount) + Number(split2.amount);
        expect(totalSplitAmount).toBeCloseTo(100);
        expect(Number(split1.amount)).toBeCloseTo(50);
        expect(Number(split2.amount)).toBeCloseTo(50);
      }
    });

    it("should prevent updating non-existent expense", async () => {
      const updateData = {
        description: "Non-existent Update",
        amount: 200,
        payerId: userId,
        splits: [{ userId, amount: 200 }],
        groupId,
      };

      const res = await request(app)
        .put(`/expenses/123456789012345678901234`) // Non-existent ID
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });

});

