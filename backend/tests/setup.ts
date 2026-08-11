// backend/tests/setup.ts
import path from "path";
import dotenv from "dotenv";

// Optional: tests run from backend/, and a fresh clone has no .env.test.
// No override, so an explicit MONGODB_URI beats the file — otherwise a
// developer's own .env.test could redirect a run at their real cluster.
const envPath = path.join(process.cwd(), ".env.test");
dotenv.config({ path: envPath });

import mongoose from "mongoose";

beforeAll(async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is required. Use docker-compose.test.yml, which supplies it, " +
      "or set it in the environment or backend/.env.test."
    );
  }

  // Safety check: ensure we're connecting to a test database
  if (!MONGODB_URI.includes("-test")) {
    throw new Error(
      "SAFETY: Test database URI must contain '-test' in the database name to prevent accidental data loss. " +
      "Please ensure .env.test uses a separate test database (e.g., 'shared-expense-app-test')."
    );
  }

  console.log("🔌 Connecting to test database...");

  // Force close any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    // Wait a moment for cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  await mongoose.connect(MONGODB_URI);

  // Wait for connection to be fully established
  await new Promise((resolve) => setTimeout(resolve, 100));

  // ✅ ONLY clear data, NOT structure
  console.log("🧹 Clearing test data (keeping structure)...");
  try {
    // Clear data but keep collections
    await mongoose.connection.db!.collection("users").deleteMany({});
    await mongoose.connection.db!.collection("groups").deleteMany({});
    await mongoose.connection.db!.collection("expenses").deleteMany({});
  } catch (error: any) {
    console.log("⚠️  Could not clear data:", error.message);
  }

  console.log("✅ Test database connected and ready");
}, 30000);

afterAll(async () => {
  console.log("🧹 Cleaning up test database...");
  try {
    // Use deleteMany instead of dropDatabase for safety
    await mongoose.connection.db!.collection("users").deleteMany({});
    await mongoose.connection.db!.collection("groups").deleteMany({});
    await mongoose.connection.db!.collection("expenses").deleteMany({});
    await new Promise((resolve) => setTimeout(resolve, 100));
  } catch (error: any) {
    console.log("⚠️  Error cleaning database:", error.message);
  }
  await mongoose.connection.close();
  console.log("✅ Test database cleaned up");
});
