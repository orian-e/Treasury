import { Router } from "express";
import UserController from "../controllers/userController";
import { authenticateToken } from "../middleware/auth";
import logger from "../utils/logger";

const userController = new UserController();

export function setUserRoutes(app: Router) {
  logger.debug("🔧 Setting up user routes...");

  app.post(
    "/users",
    authenticateToken,
    userController.createUser.bind(userController)
  );
  app.get(
    "/users",
    authenticateToken,
    userController.getUsers.bind(userController)
  );
  app.put(
    "/users/:id",
    authenticateToken,
    userController.updateUser.bind(userController)
  );
  app.delete(
    "/users/:id",
    authenticateToken,
    userController.deleteUser.bind(userController)
  );

  logger.debug("✅ User routes set up complete");
}
