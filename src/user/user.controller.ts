import { NextFunction, Request, Response } from "express";
import User from "./user.model";
import { getUserFromCaller, okResponse } from "../helpers";
import { hash } from "bcrypt";
import { ApiError } from "../errors";
import { sequelize } from "../sequelize";
import { logger } from "../logger";

export default class UserController {
  static async create(user: Omit<IUser, "id" | "createdAt" | "updatedAt">) {
    await User.create(user);
  }

  static async findByEmail(email: string) {
    return (await User.findOne({ where: { email } })) as any as IUser;
  }

  static async searchByEmail(req: Request, res: Response, next: NextFunction) {
    const pagination = req.__pagination__!;

    const rows = (await User.scope("public").findAll({
      where: { email: req.query.query as string },
      limit: pagination.page_size,
      offset: pagination.offset,
    })) as any as IUser[];

    okResponse(res, { data: { rows, pagination } });
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    const emailCount = await User.count({ where: { email: req.body.email } });

    if (emailCount > 0) {
      return next(ApiError.fromConflict("Email already exists"));
    }

    const acidic = await sequelize.transaction();

    try {
      await User.create(
        {
          email: req.body.email,
          full_name: req.body.full_name,
          password: await hash(req.body.password, 10),
          status: "active",
          auth_strategy: "local",
        },
        { transaction: acidic }
      );

      await acidic.commit();
      next();
    } catch (err) {
      logger.error("Error creating user", err);
      await acidic.rollback();
      return next(
        ApiError.fromInternalError(
          "An unexpected error occurred during user registration. Please try again later."
        )
      );
    }
  }
  static async updateUser(req: Request, res: Response, next: NextFunction) {
    const userId = getUserFromCaller(req).user_id;

    await User.update(req.body, { where: { id: userId } });

    okResponse(res);
  }

  static async getUser(req: Request, res: Response, next: NextFunction) {
    const userId = getUserFromCaller(req).user_id;

    const data = (await User.findByPk(userId, {
      attributes: [
        "id",
        "full_name",
        "email",
        "picture",
        "createdAt",
        "status",
      ],
    })) as any as IUser;
    okResponse(res, { data });
  }
}
