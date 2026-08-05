import { Router } from "express";
import rateLimit from "express-rate-limit";
import logger from "../utils/logger";
import AuthController from "../controllers/authController";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
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
