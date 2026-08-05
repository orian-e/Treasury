// backend/tests/user.test.ts
import request from "supertest";
import express from "express";
import { setAuthRoutes } from "../src/routes/authRoutes";
import { setGroupRoutes } from "../src/routes/groupRoutes";
import { setUserRoutes } from "../src/routes/userRoutes";

const app = express();
app.use(express.json());
setAuthRoutes(app);
setGroupRoutes(app);
setUserRoutes(app);

describe("User API", () => {
  let authToken: string;
  let userId: string;
  let groupId: string;
  let guestUserId: string;

  beforeAll(async () => {
    // Register user and create group
    const registerRes = await request(app).post("/auth/register").send({
      name: "User Test Admin",
      email: "usertest@example.com",
      password: "password123",
    });

    authToken = registerRes.body.token;
    userId = registerRes.body.user.id;

    // Create group
    const groupRes = await request(app)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "User Test Group" });

    groupId = groupRes.body.id;
  });

  describe("POST /users", () => {
    it("should create a guest user", async () => {
      const userData = {
        name: "Guest User",
        groupId: groupId,
      };

      const res = await request(app)
        .post("/users")
        .set("Authorization", `Bearer ${authToken}`)
        .send(userData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("Guest User");
      expect(res.body).not.toHaveProperty("email");
      expect(res.body.groupIds).toContain(groupId);

      guestUserId = res.body.id;
    });

    it("should fail with duplicate name in same group", async () => {
      const userData = {
        name: "Guest User", // Same name as first test
        groupId: groupId,
      };

      const res = await request(app)
        .post("/users")
        .set("Authorization", `Bearer ${authToken}`)
        .send(userData);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("already exists");
    });



    it("should fail without groupId", async () => {
      const newUserRes = await request(app).post("/auth/register").send({
        name: "No Group User",
        email: "nogroup@example.com",
        password: "password123",
      });

      const userData = {
        name: "Personal Group Guest",
        // No groupId provided
      };

      const res = await request(app)
        .post("/users")
        .set("Authorization", `Bearer ${newUserRes.body.token}`)
        .send(userData);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Group ID is required");
    });

    it("should fail with empty name", async () => {
      const userData = {
        name: "   ", // Empty/whitespace name
        groupId: groupId,
      };

      const res = await request(app)
        .post("/users")
        .set("Authorization", `Bearer ${authToken}`)
        .send(userData);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Name is required");
    });
  });



  describe("PUT /users/:id", () => {
    it("should update guest user", async () => {
      const updateData = {
        name: "Updated Guest Name",
      };

      const res = await request(app)
        .put(`/users/${guestUserId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe("Updated Guest Name");
    });

    it("should prevent editing account users", async () => {
      // Try to update the account user (userId)
      const updateData = {
        name: "Hacked Account User",
      };

      const res = await request(app)
        .put(`/users/${userId}`) // This is an account user with email
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain("Cannot edit account users");
    });


  });

  describe("DELETE /users/:id", () => {
    it("should fail to delete non-existent user", async () => {
      const res = await request(app)
        .delete(`/users/123456789012345678901234`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });

    it("should prevent deletion of account users", async () => {
      const res = await request(app)
        .delete(`/users/${userId}`) // Account user with email
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain("account user");
    });
  });
});
