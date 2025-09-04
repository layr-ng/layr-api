import { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  error_code: ErrorCodes;
  status_code: number;

  constructor(error_code: ErrorCodes, message?: string, status_code?: number) {
    super(message || "An error occurred");
    this.name = "ApiError";
    this.error_code = error_code;
    this.status_code = status_code ?? 500;

    // Capture stack trace if in development environment
    if (process.env.NODE_ENV === "development") {
      Error.captureStackTrace(this, ApiError);
    }
  }

  static error(error_code: ErrorCodes, message?: string) {
    return new ApiError(error_code, message, determine_status_code(error_code));
  }
  // Static factory methods for common error cases
  static fromValidation(message = "Validation error"): ApiError {
    return ApiError.error("VALIDATION_ERROR", message);
  }

  static fromNotFound(message = "Resource not found"): ApiError {
    return ApiError.error("RESOURCE_NOT_FOUND", message);
  }

  static fromInternalError(message = "Internal server error"): ApiError {
    return ApiError.error("INTERNAL_SERVER_ERROR", message);
  }

  static fromConflict(message = "Conflict error"): ApiError {
    return ApiError.error("CONFLICT", message);
  }
  static fromUnauthorized(message = "Unauthorized"): ApiError {
    return ApiError.error("UNAUTHORIZED", message);
  }

  static fromForbidden(message = "Forbidden"): ApiError {
    return ApiError.error("FORBIDDEN", message);
  }
}

const determine_status_code = (errorCode: ErrorCodes) => {
  switch (errorCode) {
    case "CONFLICT":
      return 409;
    case "FORBIDDEN":
      return 403;
    case "INTERNAL_SERVER_ERROR":
      return 500;
    case "RESOURCE_NOT_FOUND":
      return 404;
    case "UNAUTHORIZED":
      return 401;
    case "VALIDATION_ERROR":
      return 400;
    case "SUBSCRIPTION_NOT_FOUND":
      return 400;
    case "SOLO_PLAN_LIMIT_EXCEEDED":
      return 400;
    default:
      return 400;
  }
};
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
