import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables!");
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Prefer HttpOnly cookie; fall back to Authorization header for API clients
  const token =
    req.cookies?.authToken ||
    (req.headers["authorization"]?.split(" ")[1]);

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};
