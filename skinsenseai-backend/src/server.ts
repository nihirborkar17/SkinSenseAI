// MAIN SERVER
import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
// Importing middlewares
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
// importing logger
import { logger } from "./utils/logger.utils.js";
// Importing routes
import analyzeRoutes from './routes/analyze.routes.js';
import chatRoutes from './routes/chat.routes.js';


// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8000;

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  }),
);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10"),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Health Check
app.get("/api/health", (req: Request, res, Response) => {
  res.json({
    status: "healthy",
    timeStamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes will be added here
app.use('/api/analyze', analyzeRoutes);
app.use('/api/chat', chatRoutes);

// 404 Handler
app.use(notFoundHandler);

// Error Handling Middleware (must be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`Frontend URL ${process.env.FRONTEND_URL}`);
  logger.info(`AI Predict URL ${process.env.AI_PREDICT_URL}`);
  logger.info(`AI Chat URL ${process.env.AI_CHAT_URL}`);
});
