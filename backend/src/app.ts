import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import logger from "./utils/logger";
import { setExpenseRoutes } from "./routes/expenseRoutes";
import { setUserRoutes } from "./routes/userRoutes";
import { setAuthRoutes } from "./routes/authRoutes";
import { setGroupRoutes } from "./routes/groupRoutes";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "test"
    ? ".env.test"
    : ".env.development";

dotenv.config({ path: envFile });

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(limiter);

// Select MongoDB URI based on environment
const mongoUri = process.env.MONGODB_URI;

// Connect to MongoDB
mongoose
  .connect(mongoUri!)
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((err) => {
    logger.error("MongoDB connection error:", err);
  });

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

setAuthRoutes(app);
setGroupRoutes(app);
setExpenseRoutes(app);
setUserRoutes(app);

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
