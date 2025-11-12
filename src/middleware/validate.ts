/**
 * Request body validation middleware using Zod schemas
 *
 * This module provides a middleware factory function that creates Express middleware
 * for validating request bodies against Zod schemas. It uses Zod's safeParse to
 * validate incoming data and returns structured error responses on validation failure.
 *
 * @module middleware/validate
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from './errorHandler.js';

/**
 * Creates Express middleware that validates request body against a Zod schema
 *
 * This middleware factory function takes a Zod schema and returns Express middleware
 * that validates the request body. On success, the validated and typed data replaces
 * req.body. On failure, it passes a 400 ApiError to the error handler with detailed
 * validation error messages.
 *
 * @template T - The Zod schema type
 * @param schema - Zod schema to validate the request body against
 * @returns Express middleware function that validates request bodies
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { validateBody } from './middleware/validate.js';
 *
 * const userSchema = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 * });
 *
 * router.post('/users', validateBody(userSchema), createUser);
 * ```
 *
 * @example
 * Error response format:
 * ```json
 * {
 *   "error": "Validation failed: email: Invalid email format, age: Expected number, received string",
 *   "status": 400
 * }
 * ```
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Use safeParse to avoid throwing exceptions
      const result = schema.safeParse(req.body);

      if (!result.success) {
        // Extract validation errors and format them with field paths
        const errors = result.error.issues.map((err: z.ZodIssue) => ({
          field: err.path.join('.') || 'body',
          message: err.message,
        }));

        // Create a detailed error message with all validation failures
        const errorMessage = errors.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join(', ');

        // Pass ApiError with 400 status to error handling middleware
        return next(new ApiError(400, `Validation failed: ${errorMessage}`));
      }

      // Replace req.body with validated and typed data
      // This ensures type safety in subsequent middleware and controllers
      req.body = result.data;

      next();
    } catch (error) {
      // If an unexpected error occurs, pass it to the error handler
      next(error);
    }
  };
}
