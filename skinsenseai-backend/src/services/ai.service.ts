/*
 * AI SERVICE
 * - Communicates with AI team's API Endpoints
 * - This service acts as a bridge between Express backend and the AI team's endpoint
 *
 *   1. Send image to AI prediction endpoint
 *   2. Send questions to RAG chat endpoint
 *   3. Handle API errors and timeouts
 *   4. Transform AI responses into our format
 */

import axios, { AxiosError } from "axios";
import FormData from "form-data";
import { AIAnalyzeResponse, AIChatResponse } from "../types/response.types.js";
import { logger } from "../utils/logger.utils.js";
import { AppError } from "../middleware/error.middleware.js";

/*
 * AI SERVICE CLASS
 * -Can store configuration (URLs, API keys)
 * -Can have private methods
 * -Easier to test with dependency injection
 */
class AIService {
  private readonly predictUrl: string;
  private readonly chatUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeout: number = 30000; // 30 Second default timeout

  // Constructor
  // Runs when we create a new instance: new AIService()
  constructor() {
    // Load API URLs from environment variable
    this.predictUrl =
      process.env.AI_PREDICT_URL || "http://localhost:5000/predict";
    this.chatUrl = process.env.AI_CHAT_URL || "http://localhost:5000/chat";
    this.apiKey = process.env.AI_API_KEY;

    // Log configuration on startup (helps debugging)
    logger.info("AI Service initialized");
    logger.debug(`Predict URL: ${this.predictUrl}`);
    logger.debug(`Chat URL: ${this.chatUrl}`);
  }
  /*
   * ANALYZE IMAGE
   * - Sends image to AI team's prediction endpoint
   * @param imageBuffer - The image data as Buffer (from multer)
   * @param fileName - Original file name
   * @param mimeType - File MIME type (image/jpeg, image/png, etc.)
   * @param consentId - User's consent ID for tracking
   * @returns AI prediction response
   *
   * Flow:
   * 1. Create FormData with image
   * 2. Send POST request to AI endpoint
   * 3. Wait for response (with timeout)
   * 4. Return parsed response
   * 5. Handle errors gracefully
   */

  async analyzeImage(
    imageBuffer: Buffer,
    fileName: string,
    mimeType: string,
    consentId: string,
  ): Promise<AIAnalyzeResponse> {
    try {
    } catch (error) {}
  }
}

