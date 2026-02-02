/*
 * ERROR MIDDLEWARE
 *
 * Centralized error handling for the entire application
 * Why we need this:
 * - Catches all errors from routes/controllers
 * - Provides consistent error response format
 * - Logs errors for debugging
 * - Handles different types of errors differently
 * */

import type { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/response.utils.js";
import { logger } from "../utils/logger.utils.js";

// CUSTOM ERROR CLASS
export class AppError extends Error {
  /*
   * HTTP Status code
   * -400: Bad Request
   * -401: Unauthorized
   * -404: Not Found
   * -500: Internal Server Error
   */
  statusCode: number;
  details?: any;
  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
// GLOBAL ERROR HANDLER MIDDLEWARE

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // LOG THE ERROR
  logger.error("Error occurred: ", err);

  /* HANDLE MULTER ERRORS
   multer (file upload library) throws errors with specific codes
  */
  // Error: File to large
  if (err.code === "LIMIT_FILE_SIZE") {
    res
      .status(400)
      .json(errorResponse("File size too large. Maximum size is 10MB", 400));
    return;
  }
  /*
   * Error: Unexpected file field
   */
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    res.status(400).json(errorResponse("Unexpected file field.", 400));
    return;
  }

  /*
   * HANDLE CUSTOM APP ERRORS
   */
  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json(errorResponse(err.message, err.statusCode, err.details));
    return;
  }
  /*
   * HANDLE ALL OTHER ERRORS
   */

  // Try to get the status code from error or default 500
  const statusCode = err.statusCode || 500;
  // Try to get message from the error or generic message
  const message = err.message || "Internal server error";

  // Send error response
  res.status(statusCode).json(errorResponse(message, statusCode));
};
/*
 * 404 NOT FOUND HANDLER
 * Handle routes that don't exist
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  /*
   * req.originalUrl contains full requested URL
   */
  res
    .status(404)
    .json(errorResponse(`Route ${req.originalUrl} not found`, 404));
};

/*
 * ASYNC ERROR WRAPPER
 * Optional utility for handling async errors
 * Problem:
 * -Async functions in Express don't automatically catch errors
 *  -Must user try-catch everywhere
 * Solution:
 * - Wrap async route handlers in this function
 * - It catches errors and passes to error handler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
