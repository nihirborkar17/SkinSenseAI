/* 
    ANALYZE CONTROLLER
    - Handle image analysis requests

    1. Receives image upload from frontend
    2. Forwards image to AI team's prediction API
    3. Enriches AI response with educational metadata
    4. Returns complete analysis to frontend
*/

import type { Request, Response, NextFunction } from "express";
import { aiService } from "../services/ai.service.js";
import { educationService } from "../services/education.service.js";
import { successResponse } from "../utils/response.utils.js";
import { logger } from "../utils/logger.utils.js";
import { AppError } from "../middleware/error.middleware.js";
import prisma from "../lib/prisma.js";

/*
    Analyze image controller
    - Handles POST /api/analyze requests

    Request format:
    - Content-Type: multipart/form-data
    - Body:
      - image: File (required)
      - consentId: string (required)
      - timestamp: string (optional)

    Response format:
     {
        success: true,
        message: "Analysis Complete",
        data: {
            condition: "Eczema",
            confidence: 0.87,
            urgency_level: medium,
            requires_immediate_attention: false,
            chat_available: true,
            description: ",,,",
            note: "..."
        }
     }
*/

export const analyzeImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get authenticated user
    const userId = (req as any).userId;

    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    // Validate Request
    if (!req.file) {
      throw new AppError("No image file provided", 400);
    }
    // Extract request data
    const { consentId } = req.body;
    const { buffer, originalname, mimetype } = req.file;
    // Log the request
    logger.info("Image analysis request received", {
      consentId,
      fileName: originalname,
      fileSize: buffer.length,
      mimeType: mimetype,
    });

    /* Send to AI service 
       -Forward image to AI team's prediction endpoint

       aiService.analyzeImage returns:
       {
         success: true,
         prediction: {
            condition: "Eczema",
            confidence: 0.87,
            top_predictions: [...]
         }
       }
    */
    logger.info("Forwarding to AI service...");

    const aiResponse = await aiService.analyzeImage(
      buffer, // Image data as Buffer
      originalname, // Original filename
      mimetype, // MIME type (image/jpeg, etc.)
      consentId, // For AI team's tracking
    );

    //Validate AI Response
    if (!aiResponse.success || !aiResponse.prediction) {
      throw new AppError("Invalid response from AI service", 500, {
        aiResponse,
      });
    }

    // Extract prediction data
    const { condition, confidence } = aiResponse.prediction;

    /* Enrich with Educational metadata
        Add urgency level, chat availability, demo description

        educationService.enrichPrediction returns:
        {
            condition: "Eczema (Atopic Dermatitis)",
            confidence: 0.87,
            urgency_level: "medium",
            requires_immediate_attention: false,
            chat_available: true,
            description: "...",
            note: "..."
        }
    */
    logger.info("Enriching with educational content...");

    const enrichedResult = educationService.enrichPrediction(
      condition,
      confidence,
    );

    // save to db
    logger.info("Saving assessment to database...");
    const imageReference = `temp/${originalname}`;
    const savedAssessment = await prisma.assessment.create({
      data: {
        userId: userId,
        imageUrl: imageReference,
        condition: enrichedResult.condition,
        confidence: enrichedResult.confidence,
        description: enrichedResult.description,
        urgencyLevel: enrichedResult.urgency_level,
      },
    });

    // Log Consent
    if (consentId) {
      try {
        await prisma.consentLog.create({
          data: {
            userId: userId,
            consentId: consentId,
          },
        });
        logger.info("Consent logged successfully", userId, consentId);
      } catch (error) {
        logger.warn("consent logging failed (possible duplicate)", {
          consentId,
          error: error instanceof Error ? error.message : "Unknown Error",
        });
      }
    }

    // Prepare response with database ID
    const responseData = {
      assessmentId: savedAssessment.id,
      condition: enrichedResult.condition,
      confidence: enrichedResult.confidence,
      urgency_level: enrichedResult.urgency_level,
      require_immediate_attention: enrichedResult.requires_immediate_attention,
      chat_available: enrichedResult.chat_available,
      description: enrichedResult.description,
      note: enrichedResult.note,
      savedAt: savedAssessment.timestamp,
    };

    //Log success
    logger.info("Analysis completed successfully", {
      assessementId: savedAssessment.id,
      userId,
      consentId,
      condition: enrichedResult.condition,
      confidence: enrichedResult.confidence,
      urgencyLevel: enrichedResult.urgency_level,
      chatAvailable: enrichedResult.chat_available,
      processingTime: aiResponse.metadata?.processing_time,
    });

    // Step 6: Send response to frontend
    res
      .status(200)
      .json(
        successResponse(responseData, "Image analysis completed successfully"),
      );
  } catch (error) {
    // Error Handling
    logger.error("Analysis failed", error);
    next(error);
  }
};

/*
    Get Analysis status 
    - Could be used to check status of long-running analyses.
    For now, analysis is synchronous (return immediately)

    Future enhancement: Async processing with job queue
*/

export const getAnalysisStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Placesholder for future async processing
    res
      .status(200)
      .json(
        successResponse(
          { status: "Not implemented yet" },
          "Status check endpoint",
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const getAssessmentHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    //Get Authenticated user Id
    const userId = (req as any).userId;

    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    logger.info("Fetching assessment history", { userId });

    // Fetch all assessment of user.
    const assessments = await prisma.assessment.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      select: {
        id: true,
        condition: true,
        confidence: true,
        urgencyLevel: true,
        timestamp: true,
        imageUrl: true,
        description: true,
      },
    });

    logger.info("Assessment history retrieved", {
      userId,
      count: assessments.length,
    });

    res.status(200).json(
      successResponse(
        {
          assessments,
          count: assessments.length,
        },
        "Assessment history retrieved successfully",
      ),
    );
  } catch (error) {
    logger.error("Failed to get assessment history", error);
    next(error);
  }
};
