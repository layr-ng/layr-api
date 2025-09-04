import { ApiError } from "../errors";
import { getUserFromCaller, okResponse } from "../helpers";
import Notification from "./notification.model";
import { NextFunction, Request, Response } from "express";

export default class NotificationController {
  static async updateNotification(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    await Notification.update(
      { ...req.body },
      { where: { id: req.params.notification_id } }
    );

    okResponse(res);
  }

  static async getUserNotifications(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const user = getUserFromCaller(req);
    const pagination = req.__pagination__!;
    const status = req.query.status as NotificationStatus;

    if (status && !["unread", "read"].includes(status)) {
      return next(
        ApiError.fromValidation("Invalid notification status to get")
      );
    }

    const query = {
      user_id: user.user_id,
    } as any;

    if (status) {
      query.status = status;
    }

    const rows = (await Notification.findAll({
      where: query,
      limit: pagination.page_size,
      offset: pagination.offset,
      order: [["updatedAt", "DESC"]],
    })) as any as INotification[];

    okResponse(res, { data: { rows, pagination } });
  }
}
