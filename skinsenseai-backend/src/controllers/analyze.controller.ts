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
    // Step 1: Validate Request

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

    /* Step 2: Send to AI service 
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

    // Step 3: Validate AI Response
    if (!aiResponse.success || !aiResponse.prediction) {
      throw new AppError("Invalid response from AI service", 500, {
        aiResponse,
      });
    }

    // Extract prediction data
    const { condition, confidence } = aiResponse.prediction;

    /* Step 4: Enrich with Educational metadata
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

    // Step 5: Log success
    logger.info("Analysis completed successfully", {
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
        successResponse(
          enrichedResult,
          "Image analysis completed successfully",
        ),
      );
  } catch (error) {
    // Error Handling
    logger.error('Analysis failed', error);
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
    next: NextFunction
): Promise<void> => {
    try {
        // Placesholder for future async processing
        res.status(200).json(
            successResponse(
                { status: 'Not implemented yet'},
                'Status check endpoint'
            )
        );
    } catch (error) {
        next(error);
    }
};
