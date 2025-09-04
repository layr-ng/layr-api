import cors from "cors";
import { ALLOWED_ORIGINS, NODE_ENV } from "./config";
import morgan from "morgan";
import chalk from "chalk";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "./errors";
import { z } from "zod";
import { ModelStatic, Op } from "sequelize";
import { validate } from "uuid";
import { logger } from "./logger";

/**
 * Middleware to validate and check the presence of an ID in request params.
 * @param paramName - The name of the param to check (default: "id")
 * @param model - Optional Sequelize model to check existence in DB
 */
export function validateIdParam(
  paramName: string = "id",
  model?: ModelStatic<any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];

    if (!id || !validate(id)) {
      return next(
        ApiError.fromValidation(`Invalid or missing ${paramName} parameter`)
      );
    }

    if (model) {
      const record = await model.findByPk(id);
      if (!record) {
        return next(ApiError.fromNotFound(`${paramName} not found`));
      }
    }

    next();
  };
}

/**
 * @param model - Sequelize model (e.g., Merchant, Partner)
 * @param fields - Fields to check for uniqueness
 */
export const checkUniqueness = (model: ModelStatic<any>, fields: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const whereClause = {
      [Op.or]: fields
        .map((field) => ({ [field]: req.body[field] }))
        .filter((clause) => Object.values(clause)[0] !== undefined), // ignore undefined values
    };

    const existing = await model.findOne({
      where: whereClause,
      attributes: fields,
    });

    if (existing) {
      const conflicts: string[] = [];

      fields.forEach((field) => {
        if (existing[field] === req.body[field]) {
          conflicts.push(field.replace(/_/g, " "));
        }
      });

      return next(
        ApiError.fromConflict(
          `The following fields are already taken: ${conflicts.join(
            ", "
          )}. Kindly provide different values.`
        )
      );
    }

    return next();
  };
};

export function corsConfig() {
  if (NODE_ENV !== "production") return cors({});
  return cors({
    origin: (origin, callback) => {
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        const error = new Error("Origin not allowed by CORS") as any;
        error.status = 403;
        callback(error);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    optionsSuccessStatus: 200,
  });
}
// Custom middleware for validation
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (result.success) next();
    else {
      const errors = result.error.errors.map((issue) => ({
        field: issue.path.join("."), // Join path for nested fields
        error_code: "VALIDATION_ERROR",
        message: issue.message, // Custom error message
      }));

      next(ApiError.fromValidation(errors[0].message));

      return;
    }
  };
}
export const morganConfig = () =>
  morgan((tokens, req, res) => {
    const status = res.statusCode;
    const color =
      status >= 500
        ? chalk.red
        : status >= 400
        ? chalk.yellow
        : status >= 300
        ? chalk.cyan
        : status >= 200
        ? chalk.green
        : chalk.white;

    return [
      chalk.gray(tokens.method(req, res)),
      color(tokens.status(req, res)),
      chalk.magenta(tokens.url(req, res)),
      chalk.blue(tokens["response-time"](req, res) + "ms"),
    ].join(" ");
  });

export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const error_code = err.error_code ?? "INTERNAL_SERVER_ERROR";
  const status_code = err.status_code ?? 500;

  let message = err.message;

  const isProduction = NODE_ENV === "production";

  const logPayload = {
    message: err.message,
    stack: err.stack,
    code: error_code,
    status: status_code,
  };

  if (isProduction) {
    // Log to external service
    // Sentry.captureException(err);

    logger.error("Error occured", logPayload);

    message =
      error_code === "INTERNAL_SERVER_ERROR"
        ? "An unexpected error occurred. Please reach out to support so we can help resolve this promptly."
        : err.message;
  } else {
    console.error("[ERROR OCCURED]", logPayload);
  }

  res.status(status_code).json({
    status: "error",
    error_code,
    message,
  });
}
export const responseMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.ok = function <T = any>({
    message = "Success",
    data,
    meta,
  }: {
    message?: string;
    data?: T;
    meta?: Record<string, any>;
  } = {}) {
    if (
      data &&
      typeof data === "object" &&
      "rows" in data &&
      "pagination" in data
    ) {
      const { rows, pagination } = data as any;
      const { offset, ...cleanedPagination } = pagination;

      data = {
        ...data,
        pagination: {
          ...cleanedPagination,
          page_size: rows?.length || 0,
        },
      };
    }

    const payload = {
      status: "ok" as any,
      message,
      ...(data !== undefined && { data }),
      ...(meta && { meta }),
    };

    // if (process.env.NODE_ENV !== "production") {
    //   console.debug("✅ Response:", payload);
    // }

    return res.status(200).json(payload);
  };

  next();
};
