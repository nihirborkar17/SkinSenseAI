/* Chat Controller
  - Handles chat request to RAG model

  What this controller does : 
  1. Receives question about a diagnosed disease
  2. Forwards to AI team's RAG endpoint 
  3. Returns AI-generated Answer

  flow: 
  frontend -> Express Route -> current Controller 
  -> AI Service (RAG) -> Response
*/

import type { Request, Response, NextFunction } from "express";
import { aiService } from "../services/ai.service.js";
import { educationService } from "../services/education.service.js";
import { successResponse } from "../utils/response.utils.js";
import { logger } from "../utils/logger.utils.js";
import { AppError } from "../middleware/error.middleware.js";
import { sourceMapsEnabled } from "node:process";
import { isDeepStrictEqual } from "node:util";
import prisma from "../lib/prisma.js";
import { count } from "node:console";

/* Chat with RAG controller
    Handles POST /api/chat request
    
    Request Format:
    - Content-Type: application/json
    - Body: 
        {
            disease: "eczema",
            question: "How to treat?",
            consentId: "uuid"
        }   
    Response Format:
    {
        success: true,
        message: "Answer generated successfully",
        data: {
            question : "How to treat?",
            answer: "Based on medical documentation...",
            disease: "eczema",
            sources: [...],      // From RAG
            isDemoResponse: true // Indicates this is demo data
        }
    }
*/
export const chatWithRAG = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get authenticated user ID
    const userId = (req as any).userId;

    if (!userId) throw new AppError("Authentication required", 401);

    // Extract Request Data
    const { disease, question, consentId, assessmentId } = req.body;

    // Validate required fields
    if (!assessmentId) throw new AppError("Assessment Id is required", 400);

    if (!question || question.trim().length === 0)
      throw new AppError("Question is required", 400);

    if (!disease) throw new AppError("Disease is required", 400);

    // Log the request
    logger.info("Chat request received", {
      userId,
      assessmentId,
      disease,
      questionLength: question.length,
      consentId,
    });

    // Verify assessment exists and belongs to user
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: userId,
      },
    });

    if (!assessment) {
      throw new AppError(
        "Assessment not found or does not belong to user",
        404,
      );
    }

    logger.info("Assessment verified", {
      assessmentId,
      condition: assessment.condition,
    });

    const chatResponse = await aiService.chatWithRAG(
      disease,
      question,
      consentId,
    );

    const savedChat = await prisma.chatHistory.create({
      data: {
        assessmentId: assessmentId,
        question: question,
        answer: chatResponse.answer,
      },
    });

    logger.info("Chat saved successfully", {
      chatId: savedChat.id,
      assessmentId,
    });

    // Step 5: Send Response
    res.status(200).json({
      success: true,
      data: {
        chatId: savedChat.id,
        question: question,
        answer: chatResponse.answer,
        sources: chatResponse.sources || [],
        savedAt: savedChat.timestamp,
        isDemoResponse: false,
      },
    });
  } catch (error) {
    // ERROR HANDLING
    logger.error("Chat request failed", error);
    next(error);
  }
};

/* GET CHAT HISTORY

could store chat history in database, allowing users to review previous Q&A

Requires:
 - Database to store conversation
 - User authentication
 - Session management
*/

export const getChatHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get authenticated userId
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    // Get assessmentID from URL Params
    const { assessmentId } = req.params;

    if (!assessmentId) {
      throw new AppError("Assessment Id is required");
    }

    if (typeof assessmentId !== "string") {
      throw new AppError("Invalid Assessment Id");
    }

    logger.info("Fetching chat history", {
      userId,
      assessmentId,
    });

    // Verifyu assessment exists and belongs to user
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: userId,
      },
    });

    if (!assessment) {
      throw new AppError(
        "Assessment not found or does not belong to user",
        404,
      );
    }

    // Get Chat history for this assessment
    const chatHistory = await prisma.chatHistory.findMany({
      where: { assessmentId },
      orderBy: { timestamp: "asc" },
      select: {
        id: true,
        question: true,
        answer: true,
        timestamp: true,
      },
    });

    logger.info("Chat history retrieved", {
      assessmentId,
      count: chatHistory.length,
    });

    res.status(200).json(
      successResponse(
        {
          history: chatHistory,
          count: chatHistory.length,
        },
        "Chat history retrieved successfully",
      ),
    );
  } catch (error) {
    logger.error("Failed to get chat history", error);
    next(error);
  }
};
