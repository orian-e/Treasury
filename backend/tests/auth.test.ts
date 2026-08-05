// backend/tests/auth.test.ts
import request from "supertest";
import express from "express";
import { setAuthRoutes } from "../src/routes/authRoutes";

const app = express();
app.use(express.json());
setAuthRoutes(app);

describe("Auth API", () => {
  describe("POST /auth/register", () => {
    it("should register a new user with valid data", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      const res = await request(app).post("/auth/register").send(userData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("user");
      expect(res.body.user.name).toBe("John Doe");
      expect(res.body.user.email).toBe("john@example.com");
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });

    it("should fail with duplicate email", async () => {
      const userData = {
        name: "Jane Doe",
        email: "john@example.com", // Same email as previous test
        password: "password123",
      };

      const res = await request(app).post("/auth/register").send(userData);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("already exists");
    });

    it("should fail with invalid email format", async () => {
      const userData = {
        name: "Invalid User",
        email: "invalid-email",
        password: "password123",
      };

      const res = await request(app).post("/auth/register").send(userData);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Invalid email");
    });

    it("should fail with missing required fields", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ name: "Incomplete User" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("required");
    });



    it("should handle email case insensitivity for registration and login", async () => {
      // Step 1: Register user with uppercase email
      const registerData = {
        name: "Case Test User",
        email: "TEST@EXAMPLE.COM", // Changed to avoid conflicts
        password: "password123",
      };

      const registerRes = await request(app)
        .post("/auth/register")
        .send(registerData);

      expect(registerRes.statusCode).toBe(201);
      // Your API normalizes to lowercase
      expect(registerRes.body.user.email).toBe("test@example.com");

      // Step 2: Try to register again with lowercase (should fail - duplicate)
      const duplicateRes = await request(app).post("/auth/register").send({
        name: "Duplicate User",
        email: "test@example.com", // lowercase version
        password: "password123",
      });

      expect(duplicateRes.statusCode).toBe(400);
      expect(duplicateRes.body.error).toContain("already exists");

      // Step 3: Login with different case than stored (should work)
      const loginRes = await request(app).post("/auth/login").send({
        email: "Test@Example.Com", // mixed case
        password: "password123",
      });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.user.email).toBe("test@example.com"); // normalized
    });

    it("should fail with password too short", async () => {
      const userData = {
        name: "Short Pass User",
        email: "shortpass@example.com",
        password: "123", // Less than 6 characters
      };

      const res = await request(app).post("/auth/register").send(userData);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("at least 6 characters");
    });


  });

  describe("POST /auth/login", () => {
    it("should login with valid credentials", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "john@example.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("user");
    });

    it("should fail with invalid password", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "john@example.com",
        password: "wrongpassword",
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain("Invalid");
    });

    it("should fail with non-existent email", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "nonexistent@example.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain("Invalid");
    });
  });
});
