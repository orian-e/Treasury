// backend/tests/group.test.ts
import request from "supertest";
import express from "express";
import { setAuthRoutes } from "../src/routes/authRoutes";
import { setGroupRoutes } from "../src/routes/groupRoutes";

const app = express();
app.use(express.json());
setAuthRoutes(app);
setGroupRoutes(app);

describe("Group API", () => {
  let authToken: string;
  let userId: string;
  let groupId: string;

  beforeAll(async () => {
    // Register and login user
    const registerRes = await request(app).post("/auth/register").send({
      name: "Group Test User",
      email: "grouptest@example.com",
      password: "password123",
    });

    authToken = registerRes.body.token;
    userId = registerRes.body.user.id;
  });

  describe("POST /groups", () => {
    it("should create a new group", async () => {
      const groupData = {
        name: "Test Group",
        description: "A test group",
      };

      const res = await request(app)
        .post("/groups")
        .set("Authorization", `Bearer ${authToken}`)
        .send(groupData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("Test Group");
      expect(res.body.description).toBe("A test group");
      // Temporarily added console.log for debugging
      console.log("Group response:", JSON.stringify(res.body, null, 2));
      expect(res.body.creatorId).toBe(userId);

      groupId = res.body.id; // Save for other tests
    });

    it("should fail without authentication", async () => {
      const res = await request(app)
        .post("/groups")
        .send({ name: "Unauthorized Group" });

      expect(res.statusCode).toBe(401);
    });

    it("should fail without group name", async () => {
      const res = await request(app)
        .post("/groups")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ description: "No name group" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("required");
    });


  });



  describe("PUT /groups/:groupId", () => {
    it("should update group as creator", async () => {
      const updateData = {
        name: "Updated Group Name",
        description: "Updated description",
      };

      const res = await request(app)
        .put(`/groups/${groupId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe("Updated Group Name");
      expect(res.body.description).toBe("Updated description");
    });

    it("should prevent non-creator from updating group", async () => {
      // Create another user
      const otherUserRes = await request(app).post("/auth/register").send({
        name: "Other User",
        email: "other@example.com",
        password: "password123",
      });

      // Join the group first
      const inviteRes = await request(app)
        .get(`/groups/${groupId}/invite`)
        .set("Authorization", `Bearer ${authToken}`);

      await request(app)
        .post("/groups/join")
        .set("Authorization", `Bearer ${otherUserRes.body.token}`)
        .send({ inviteCode: inviteRes.body.inviteCode });

      // Try to update as non-creator
      const updateData = {
        name: "Unauthorized Update",
        description: "Should fail",
      };

      const res = await request(app)
        .put(`/groups/${groupId}`)
        .set("Authorization", `Bearer ${otherUserRes.body.token}`) // Not the creator
        .send(updateData);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain("creator");
    });
  });

  describe("POST /groups/join", () => {
    it("should generate and use invite code", async () => {
      // First, get invite info to generate invite code
      const inviteRes = await request(app)
        .get(`/groups/${groupId}/invite`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(inviteRes.statusCode).toBe(200);
      expect(inviteRes.body).toHaveProperty("inviteCode");

      // Register another user
      const newUserRes = await request(app).post("/auth/register").send({
        name: "Joiner User",
        email: "joiner@example.com",
        password: "password123",
      });

      // Join group with invite code
      const joinRes = await request(app)
        .post("/groups/join")
        .set("Authorization", `Bearer ${newUserRes.body.token}`)
        .send({ inviteCode: inviteRes.body.inviteCode });

      expect(joinRes.statusCode).toBe(200);
      expect(joinRes.body.message).toContain("Successfully joined");
    });

    it("should prevent joining with invalid invite code", async () => {
      const newUserRes = await request(app).post("/auth/register").send({
        name: "Invalid Code User",
        email: "invalidcode@example.com",
        password: "password123",
      });

      const res = await request(app)
        .post("/groups/join")
        .set("Authorization", `Bearer ${newUserRes.body.token}`)
        .send({ inviteCode: "INVALID123" });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain("Invalid invite code");
    });

    it("should prevent duplicate group membership", async () => {
      const inviteRes = await request(app)
        .get(`/groups/${groupId}/invite`)
        .set("Authorization", `Bearer ${authToken}`);

      // Try to join the same group again
      const res = await request(app)
        .post("/groups/join")
        .set("Authorization", `Bearer ${authToken}`) // Original creator
        .send({ inviteCode: inviteRes.body.inviteCode });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("already a member");
    });
  });

  describe("DELETE /groups/:groupId", () => {


    it("should fail to delete non-existent group", async () => {
      const res = await request(app)
        .delete(`/groups/123456789012345678901234`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
