import AuthController from "../auth/auth.controller";
import { Router } from "express";
import { catchAsync } from "../errors";
import { validateRequest } from "../middleware";
import AdminController from "./admin.controller";
import {
  AdminGetResetPasswordLinkSchema,
  AdminRegistrationSchema,
  CreateSubscriptionDiscountSchema,
  LoginAdminSchema,
} from "./admin.schema";
import { ResetPasswordSchema } from "../globalSchemas";
import { setPaginationParameters } from "../helpers";
const adminRouter = Router();

adminRouter
  .route("/")
  .get(AuthController.verifyAuth("admin"), catchAsync(AdminController.getAdmin))
  .post(
    validateRequest(AdminRegistrationSchema),
    catchAsync(AdminController.register),
    catchAsync(AuthController.login("admin"))
  );
adminRouter
  .route("/reset_password")
  .post(
    validateRequest(ResetPasswordSchema),
    catchAsync(AuthController.resetPassword("admin"))
  );
adminRouter
  .route("/forgot_password")
  .post(
    validateRequest(AdminGetResetPasswordLinkSchema),
    catchAsync(AuthController.requestResetPasswordLink("admin"))
  );

adminRouter.route("/logout").delete(catchAsync(AuthController.logout));

adminRouter
  .route("/login")
  .post(
    validateRequest(LoginAdminSchema),
    catchAsync(AuthController.login("admin"))
  );
// adminRouter.use("*", AuthController.verifyAuth("admin"));

adminRouter
  .route("/user")
  .get(setPaginationParameters, catchAsync(AdminController.getUsers));
adminRouter
  .route("/diagram")
  .get(setPaginationParameters, catchAsync(AdminController.getDiagrams));
adminRouter
  .route("/team")
  .get(setPaginationParameters, catchAsync(AdminController.getTeams));
adminRouter
  .route("/subscription")
  .get(setPaginationParameters, catchAsync(AdminController.getSubscriptions));
adminRouter
  .route("/subscription_discount")
  .post(
    validateRequest(CreateSubscriptionDiscountSchema),
    catchAsync(AdminController.createSubscriptionDiscountCode)
  )
  .get(
    setPaginationParameters,
    catchAsync(AdminController.getSubscriptionDiscounts)
  );

export default adminRouter;
