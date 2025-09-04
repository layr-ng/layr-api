import AuthController from "../auth/auth.controller";
import { Router } from "express";
import UserController from "./user.controller";
import { catchAsync } from "../errors";
import { validateRequest } from "../middleware";
import { RegisterUserSchema } from "./user.schema";
import { setPaginationParameters } from "../helpers";
import { ResetPasswordSchema } from "../globalSchemas";
import {
  LoginUserSchema,
  RequestPasswordResetLinkSchema,
} from "../auth/auth.schema";
const userRouter = Router();

userRouter
  .route("/")
  .get(AuthController.verifyAuth("user"), catchAsync(UserController.getUser))
  .post(
    validateRequest(RegisterUserSchema),
    catchAsync(UserController.register),
    catchAsync(AuthController.login("user"))
  );

userRouter
  .route("/reset_password")
  .post(
    validateRequest(ResetPasswordSchema),
    catchAsync(AuthController.resetPassword("user"))
  );
userRouter
  .route("/forgot_password")
  .post(
    validateRequest(RequestPasswordResetLinkSchema),
    catchAsync(AuthController.requestResetPasswordLink("user"))
  );
userRouter.route("/lgout").delete(catchAsync(AuthController.logout));

userRouter
  .route("/login")
  .post(
    validateRequest(LoginUserSchema),
    catchAsync(AuthController.login("user"))
  );

userRouter
  .route("/email")
  .get(setPaginationParameters, catchAsync(UserController.searchByEmail));

export default userRouter;
