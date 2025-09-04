import { ApiError } from "../errors";
import SubscriptionController from "./subscription.controller";
import { Request, Response, NextFunction, CookieOptions } from "express";

export class SubscriptionMiddleware {
  static async validateUserSubscription(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const validSubscriptionStatus =
      await SubscriptionController.validateSubscriptionStatus(req.__user__!.id);

    if (validSubscriptionStatus.status === "error") {
      return next(
        ApiError.error(
          "SUBSCRIPTION_NOT_FOUND",
          "Looks like you don’t have an active subscription yet. Subscribe now to unlock your account."
        )
      );
    }
    next();
  }
}
