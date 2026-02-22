/*
  	Validation Middleware
	Validates incoming request before processing 
 * */

import type { Request, Response, NextFunction } from "express";
import { ValidationErrorResponse } from "../utils/response.utils.js";
import type { ValidationError } from "../types/response.types.js";

/*
 * VALIDATE IMAGE UPLOAD REQUEST
 * This middleware runs AFTER multer processes the file
 * checks:
 * Was the file actually uploaded? is consentId present? is consentId a valid UUID format?
 *
 * Flow:
 * Request => Multer => This Validator => Controller
 * */

export const validateImageUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Array to collect all validation errors
  const errors: ValidationError[] = [];

  // CHECK 1: File Upload
  if (!req.file) {
    errors.push({
      field: "Image",
      message: "Image File is required",
    });
  }
  // CHECK 2: Consent ID Exists
  if (!req.body.consentId) {
    errors.push({
      field: "ConsentId",
      message: "Consent ID is required",
    });
  }
  /*
	 * CHECK 3: Valid UUID Format
	 * UUID v4 format:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx 
	 Regex breakdown:
  	 ^[0-9a-f]{8}  → 8 hex characters
  	 * -             → literal dash
  	 * [0-9a-f]{4}   → 4 hex characters
  	 * -             → literal dash
  	 * [0-9a-f]{4}   → 4 hex characters
  	 * -             → literal dash
  	 * [0-9a-f]{4}   → 4 hex characters
  	 * -             → literal dash
  	 * [0-9a-f]{12}$ → 12 hex characters*
	* */

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (req.body.consentId && !uuidRegex.test(req.body.consentId)) {
    errors.push({
      field: "consentId",
      message: "Invalid consent ID Format",
    });
  }
  /*
   * SEND ERROR RESPONSE OR CONTINUE
   * if error -> Send 400 (Bad request) response and return
   * if no error -> next() to pass the control
   * */
  if (errors.length > 0) {
    res.status(400).json(ValidationErrorResponse(errors));
    return;
  }
  next();
};
/*
 * VALIDATE CHAT REQUEST - Used for the RAG chat endpoint
 * */
export const validateChatRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors: ValidationError[] = [];
  /*
   * CHECK 1: Question Exists or Not Empty
   * */
  if (!req.body.question || req.body.question.trim() === "") {
    errors.push({
      field: "question",
      message: "Question is Required",
    });
  }

  /*
   * CHECK 2: Disease Information Exists
   * */
  if (!req.body.disease) {
    errors.push({
      field: "disease",
      message: "Disease information is required",
    });
  }
  // If errors exist, send error response and stop
  if (errors.length > 0) {
    res.status(400).json(ValidationErrorResponse(errors));
    return;
  }
  next();
};
/**
 * USAGE IN ROUTES:
 *
 * import { validateImageUpload, validateChatRequest } from './middleware/validation';
 *
 * // Image upload route - validation runs AFTER multer
 * app.post('/analyze',
 *   upload.single('image'),    // 1. Multer extracts file
 *   validateImageUpload,       // 2. Validate the request
 *   analyzeController          // 3. Process if valid
 * );
 *
 * // Chat route - validation runs on JSON body
 * app.post('/chat',
 *   validateChatRequest,       // 1. Validate question & disease
 *   chatController             // 2. Process if valid
 * );
 */
