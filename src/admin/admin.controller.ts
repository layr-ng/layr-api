import { NextFunction, Request, Response } from "express";
import { hash } from "bcrypt";
import { ApiError } from "../errors";
import { sequelize } from "../sequelize";
import Admin from "./admin.model";
import type {
  IAdminRegistrationSchema,
  ICreateSubscriptionDiscountSchema,
} from "./admin.schema";
import User from "../user/user.model";
import Subscription from "../subscription/subscription.model";
import SubscriptionDiscount from "../subscription/subscriptionDiscount.model";
import Diagram from "../diagram/diagram.model";
import Team from "../team/team.model";
import { randomBytes } from "crypto";

export default class AdminController {
  static async createSubscriptionDiscountCode(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const code = randomBytes(3).toString("base64");

    const body = req.body as ICreateSubscriptionDiscountSchema;

    await SubscriptionDiscount.create({
      code,
      discount_percentage: body.discount_percentage,
      expiration_date: body.expiration_date,
      max_redemptions: body.max_redemptions,
    });

    res.ok();
  }

  static async getTeams(req: Request, res: Response, next: NextFunction) {
    const pagination = req.__pagination__!;
    const rows = (
      await Team.findAll({
        offset: pagination.offset,
        limit: pagination.page_size,
      })
    ).map((i) => i.toJSON()) as any as ITeam[];

    res.ok({ data: { rows, pagination } });
  }

  static async getDiagrams(req: Request, res: Response, next: NextFunction) {
    const pagination = req.__pagination__!;
    const rows = (
      await Diagram.findAll({
        offset: pagination.offset,
        limit: pagination.page_size,
      })
    ).map((i) => i.toJSON()) as any as IDiagram[];

    res.ok({ data: { rows, pagination } });
  }

  static async getSubscriptionDiscounts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const pagination = req.__pagination__!;
    const rows = (
      await SubscriptionDiscount.findAll({
        offset: pagination.offset,
        limit: pagination.page_size,
      })
    ).map((i) => i.toJSON()) as any as ISubscriptionDiscount[];

    res.ok({ data: { rows, pagination } });
  }

  static async getSubscriptions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const pagination = req.__pagination__!;
    const rows = (
      await Subscription.findAll({
        offset: pagination.offset,
        limit: pagination.page_size,
      })
    ).map((i) => i.toJSON()) as any as ISubscription[];

    res.ok({ data: { rows, pagination } });
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    const pagination = req.__pagination__!;
    const rows = (
      await User.findAll({
        offset: pagination.offset,
        limit: pagination.page_size,
      })
    ).map((i) => i.toJSON()) as any as Omit<IUser, "password">[];

    res.ok({ data: { rows, pagination } });
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    const body = req.body as IAdminRegistrationSchema;
    const emailCount = await Admin.count({ where: { email: body.email } });

    if (emailCount > 0) {
      return next(ApiError.fromConflict("Email already exists"));
    }

    const acidic = await sequelize.transaction();

    await Admin.create(
      {
        email: body.email,
        full_name: body.full_name,
        password: await hash(body.password, 10),
        auth_strategy: "local",
      },
      { transaction: acidic }
    );
  }
  static async getAdmin(req: Request, res: Response, next: NextFunction) {
    const data = (
      await Admin.findOne({
        where: {},
        attributes: [
          "id",
          "full_name",
          "email",
          "picture",
          "createdAt",
          "status",
        ],
      })
    )?.toJSON() as any as IUser;
    res.ok({ data });
  }
}
