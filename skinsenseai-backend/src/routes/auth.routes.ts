import express from "express";
import {
  signup,
  login,
  getCurrentUser,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// public routes
router.post("/signup", signup);
router.post("/login", login);

// protected routes
router.get("/me", authenticateToken, getCurrentUser);

export default router;
