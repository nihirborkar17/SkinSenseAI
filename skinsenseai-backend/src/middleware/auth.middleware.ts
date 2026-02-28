import type { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ApiResponse } from "../types/response.types.js";

interface jwtPayload {
  userId: string;
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // Get token from header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer Token

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token is required",
      } as ApiResponse);
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Attaching userId to request
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    // instanceOf check whether its object of class
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Token has expired.",
      } as ApiResponse);
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      } as ApiResponse);
      return;
    }

    res.status(500).json({
      success: false,
      message: "Authentication error",
    } as ApiResponse);
  }
};
