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
import { originAgentCluster } from "helmet";

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
      logger.info(
        `Sending image to AI service for analysis (Consent: ${consentId})`,
      );
      /*
       * CREATE FORMDATA
       * - AI team expects multipart/form-data (standard for file upload)
       *   - Allows sending file + metadata together
       *
       *   FormData structure:
       *   {
       *  	image: <binary file data>,
       *  	consentId: "uuid-string",
       *  	timestamp: "ISO-timestamp"
       *   }
       */
      const formData = new FormData();

      // Append image file
      formData.append("image", imageBuffer, {
        filename: fileName,
        contentType: mimeType,
      });
      // Append metadata
      formData.append("consentId", consentId);
      formData.append("timestamp", new Date().toISOString());

      /*
       * SEND REQUEST TO AI TEAM
       * Using axios.post:
       * - More Features than fetch
       * - Better error handling
       * - Automatic JSON parsing
       * - Request/response interceptors
       * - Timeout support
       */
      const response = await axios.post<AIAnalyzeResponse>(
        this.predictUrl, // Where to send
        formData, // What to send
        {
          // Request Configuration
          headers: {
            // FormData automatically sets Content-Tpe with boundary
            ...formData.getHeaders(),

            /*
             * Add API key if configured
             * Some AI APIs requires authentication
             * Example header: "X-API-Key: my-key-here"
             */
            ...(this.apiKey && { "X-API-Key": this.apiKey }),
          },
          /*
           * Timeout in milliseconds
           * Set : 30 seconds
           */
          timeout: this.timeout,

          /*
           * Validate Response Status
           * By default, axios only rejects on network errors
           * This make it reject on any non-2XX status code
           */
          validateStatus: (status) => status >= 200 && status < 300,
        },
      );
      /*
       * LOG SUCCESS
       * - Helps track successful requests
       * - Include processing time if AI team provides it
       */
      logger.info("Image analysis successful", {
        consentId,
        confidence: response.data.prediction?.confidence,
        processingTime: response.data.metadata?.processing_time,
      });

      // Return the AI response
      return response.data;
    } catch (error) {
      /*
       * ERROR HANDLING
       * Different types of errors need different handling:
       * 1. Network errors (can't reach AI server)
       * 2. Timeout errors (took too long)
       * 3. HTTP errors (4xx, 5xx status codes)
       * 4. Unknown errors
       */
      logger.error("AI analysis failed", error);
      /**
       * Check if it's an Axios error
       *
       * AxiosError has special properties:
       * - response: The HTTP response (if received)
       * - request: The request that was sent
       * - code: Error code (ECONNREFUSED, ETIMEDOUT, etc.)
       */
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        /*
         * TIMEOUT ERROR
         * Request took longer than timeout limit
         * User should know processing is taking too long
         */
        if (axiosError.code === "ECONNABORTED") {
          throw new AppError(
            "AI analysis timed out. Please try again with different image.",
            504, // 504 Gateway Timeout
            { reason: "Request timeout", timeout: this.timeout },
          );
        }
        /**
         * CONNECTION ERROR
         *
         * Can't reach AI server
         * Possible reasons:
         * - AI server is down
         * - Wrong URL
         * - Network issues
         */
        if (axiosError.code === "ECONNREFUSED") {
          throw new AppError(
            "AI service is currently unavailable. Please Try again later.",
            503,
            { reason: "Cannot connect to AI service" },
          );
        }
        /**
         * HTTP ERROR RESPONSE
         *
         * AI server responded but with an error status
         * Examples: 400 Bad Request, 500 Internal Server Error
         */
        if (axiosError.response) {
          const status = axiosError.response?.status;
          const data = axiosError.response?.data as any;
          /*
           * EXTRACT ERROR MESSAGE SAFELY
           *Try multiple common error message formats:
           * 1. data.message
           * 2. data.error
           * 3. Stringified data
           * 4. Fallback to generic message
           */
          const errorMessage =
            data?.message ||
            data?.error(typeof data === "string" ? data : "Analysis failed");

          throw new AppError(`AI service error: ${errorMessage}`, status, {
            aiReponse: data,
          });
        }
      }
      /*
       * UNKNOWN ERROR
       * Something unexpected happened
       */
      throw new AppError("An unexpected error occurred during analysis.", 500, {
        originalError: error instanceof Error ? error.message : "Unknown Error",
      });
    }
  }

  /**
   * CHAT WITH RAG
   *
   * Sends question to AI team's RAG (Retrieval-Augmented Generation) endpoint
   *
   * @param disease - The identified disease name (for context)
   * @param question - User's question about the disease
   * @param consentId - User's consent ID (optional for tracking)
   * @returns AI chat response with answer and sources
   *
   * Flow:
   * 1. Create JSON payload with disease + question
   * 2. Send POST request to RAG endpoint
   * 3. Receive contextualized answer
   * 4. Return answer with sources
   */

  async chatWithRAG(
    disease: string,
    question: string,
    consentId?: string,
  ): Promise<AIChatResponse> {
    try {
      logger.info(`Sending chat request to RAG service`, {
        disease,
        consentId,
      });
      /*
       * SEND REQUEST TO RAG ENDPOINT
       * unlike image upload, this is JSON (not formData)
       * Request Body:
       * {
       *   disease: "Eczema",
       *   question: "How do I treat this?"k,
       *   consentId: "uuid" (optional)
       * }
       */
      const response = await axios.post<AIChatResponse>(
        this.chatUrl,
        {
          disease,
          question,
          ...(consentId && { consentId }),
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(this.apiKey && { "X-API-Key": this.apiKey }),
          },
          timeout: this.timeout,
        },
      );
      logger.info("RAG chat successful", {
        disease,
        answerLength: response.data.answer?.length,
      });
      return response.data;
    } catch (error) {
      logger.error("RAG chat failed", error);

      // Similar error handling as analyzeImage
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.code === "ECONNABORTED") {
          throw new AppError("chat request timed out. Please try again.", 504, {
            reason: "Request timeout",
          });
        }
        if (axiosError.code === "ECONNREFUSED") {
          throw new AppError("Chat service is currently unavailable.", 503, {
            reason: "Cannot connect to RAG service",
          });
        }
        if (axiosError.response) {
          const status = axiosError.response.status;
          const data = axiosError.response.data as any;
          throw new AppError(
            `Chat Service error: ${data?.message || "Chat failed"}`,
            status,
            { ragResponse: data },
          );
        }
      }

      throw new AppError("Unexpected Error in RAG chat", 500, {
        originalError: error instanceof Error ? error.message : "Unknown Error",
      });
    }
  }
  /*
   * HEALTH CHECK (Optional but useful)
   * Ping the AI service to check if it's alive
   * Can be used for monitoring or startup checks
   */

  async healthCheck(): Promise<boolean> {
    try {
      // Try to reach the predict endpoint with a HEAD request
      await axios.head(this.predictUrl, { timeout: 5000 });
      return true;
    } catch (error) {
      logger.warn("AI service health check failed", error);
      return false;
    }
  }
  // Class End
}
/*
 * EXPORT SINGLETON INSTANCE
 *
 * Why singleton?
 * - Only need one instance
 * - Configuration loaded once
 * - Can be imported anywhere: import { aiService } from '...'
 *
 * Usage in controllers:
 * import { aiService } from '../services/ai.service';
 * const result = await aiService.analyzeImage(...);
 */
export const aiService = new AIService();

