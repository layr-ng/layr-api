import { Router } from "express";
import { validateRequest } from "../middleware";
import { catchAsync } from "../errors";
import SubscriptionController from "./subscription.controller";
import { CreateSubscriptionSchema } from "./subscription.schema";
import AuthController from "../auth/auth.controller";
import { setPaginationParameters } from "../helpers";

const subscriptionRouter = Router();

subscriptionRouter
  .route("/pricing")
  .post(catchAsync(SubscriptionController.getSubscriptionPlanPricing));

subscriptionRouter
  .route("/discount/:discount_code")
  .get(catchAsync(SubscriptionController.getSubscriptionDiscount));

subscriptionRouter.use(catchAsync(AuthController.verifyAuth("user")));

subscriptionRouter
  .route("/new")
  .post(
    validateRequest(CreateSubscriptionSchema),
    catchAsync(SubscriptionController.createSubscription)
  );

subscriptionRouter
  .route("/active")
  .get(
    setPaginationParameters,
    catchAsync(SubscriptionController.getActiveSubscriptions)
  );

subscriptionRouter
  .route("/verify_payment")
  .post(catchAsync(SubscriptionController.verifySubscriptionPayment));
export default subscriptionRouter;
