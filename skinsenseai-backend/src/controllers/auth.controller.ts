import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { AIPrediction, ApiResponse } from "../types/response.types.js";
import { timeStamp } from "node:console";

// Generate JWT Token
const generateToken = (userId: string): string => {
  const payload = { userId };
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    "7d") as SignOptions["expiresIn"];

  return jwt.sign(payload, secret, { expiresIn });
};

// Sign up Controller
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    //validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      } as ApiResponse);
      return;
    }

    // check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "User wtih this email already exists",
      } as ApiResponse);
      return;
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
      },
      timeStamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error("Signup error: ", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during signup",
    } as ApiResponse);
  }
};

// Login Controller
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      } as ApiResponse);
      return;
    }

    // Find User
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      } as ApiResponse);
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      } as ApiResponse);
      return;
    }

    // Generate Token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: "Login Successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          createAt: user.createdAt,
        },
        token,
      },
      timeStamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
    } as ApiResponse);
  }
};

// Get Current User (Protected Route)
export const getCurrentUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).userId; // Will be set by auth middleware
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: { user },
      timeStamp: new Date().toISOString(),
    } as ApiResponse);
    return;
  } catch (e) {
    console.error("Get user error: ", e);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    } as ApiResponse);
  }
};
