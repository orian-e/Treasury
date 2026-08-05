import { Request, Response } from "express";
import User from "../models/usersModel";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables!");
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches JWT expiry
};

class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body;

      if (!email || !password || !name) {
        return res
          .status(400)
          .json({ error: "Name, email and password are required" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "User with this email already exists" });
      }

      const user = new User({
        name,
        email: normalizedEmail,
        passwordHash: password,
        isAdmin: false,
      });

      const savedUser = await user.save();

      const token = jwt.sign(
        { userId: savedUser._id, name: savedUser.name, email: savedUser.email },
        JWT_SECRET!,
        { expiresIn: "7d" }
      );

      const obj = savedUser.toObject() as any;
      obj.id = obj._id;
      delete obj.passwordHash;
      delete obj._id;

      res.cookie("authToken", token, COOKIE_OPTIONS);
      res.status(201).json({ token, user: obj });
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(400).json({ error: "User with this email already exists" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!user.comparePassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign(
        { userId: user._id, name: user.name, email: user.email },
        JWT_SECRET!,
        { expiresIn: "7d" }
      );

      const obj = user.toObject() as any;
      obj.id = obj._id;
      delete obj.passwordHash;
      delete obj._id;

      res.cookie("authToken", token, COOKIE_OPTIONS);
      res.json({ token, user: obj });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async logout(req: Request, res: Response) {
    res.clearCookie("authToken", COOKIE_OPTIONS);
    res.json({ message: "Logged out" });
  }

  // Verify token — reads from cookie (set by middleware) or Authorization header
  async verifyToken(req: Request, res: Response) {
    try {
      const token =
        req.cookies?.authToken ||
        req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      const decoded = jwt.verify(token, JWT_SECRET!) as any;
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const obj = user.toObject() as any;
      obj.id = obj._id;
      delete obj.passwordHash;
      delete obj._id;

      res.json({ user: obj });
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  }
}

export default AuthController;
