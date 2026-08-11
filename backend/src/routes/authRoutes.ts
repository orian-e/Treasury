import { Router } from "express";
import rateLimit from "express-rate-limit";
import logger from "../utils/logger";
import AuthController from "../controllers/authController";

// Brute-force protection on the credential endpoints. The test suites register
// and log in dozens of times per run from a single IP, which exhausts a limit
// sized for real users — and a throttled login fails as a timed-out post-login
// locator, which reads as a broken UI rather than as rate limiting. Give the
// test environment headroom; every other environment keeps the tight limit.
const authAttemptsPerWindow = process.env.NODE_ENV === "test" ? 500 : 20;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authAttemptsPerWindow,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

const authController = new AuthController();

export function setAuthRoutes(app: Router) {
  logger.debug("Setting up auth routes...");

  // Test route
  app.get("/auth/test", (req, res) => {
    res.json({ message: "Auth routes are working!" });
  });

  // Email/password authentication
  app.post("/auth/register", authLimiter, authController.register.bind(authController));
  app.post("/auth/login", authLimiter, authController.login.bind(authController));

  // Token verification
  app.get("/auth/verify", authController.verifyToken.bind(authController));

  // Logout — clears the auth cookie
  app.post("/auth/logout", authController.logout.bind(authController));
}
