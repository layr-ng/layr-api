import { Router } from "express";
import { setPaginationParameters } from "../helpers";
import { catchAsync } from "../errors";
import NotificationController from "./notification.controller";
import AuthController from "../auth/auth.controller";
const notificationRouter = Router();

notificationRouter.use(AuthController.verifyAuth("user"));

notificationRouter
  .route("/")
  .get(
    setPaginationParameters,
    catchAsync(NotificationController.getUserNotifications)
  );
notificationRouter
  .route("/:notification_id")
  .patch(catchAsync(NotificationController.updateNotification));

export default notificationRouter;
