import { NextFunction, Request, Response } from "express";
import type { ICreateSubscriptionSchema } from "./subscription.schema";
import Subscription from "./subscription.model";
import { getUserFromCaller } from "../helpers";
import { FLUTTERWAVE_SECRET_KEY } from "../config";
import { v4 as uuid } from "uuid";
import User from "../user/user.model";
import SubscriptionDiscount from "./subscriptionDiscount.model";
import { ApiError } from "../errors";
import { sequelize } from "../sequelize";
import { Op } from "sequelize";

const PRICING: Record<SubscriptionPlans, { weekly: number; monthly: number }> =
  {
    pro: { weekly: 4, monthly: 7 },
    team: { weekly: 6, monthly: 15 },
  };

export default class SubscriptionController {
  static async getActiveSubs(userId: string): Promise<ISubscription[]> {
    const rows = (
      await Subscription.findAll({ where: { user_id: userId } })
    ).map((i) => i.toJSON()) as any as ISubscription[];

    return rows.filter(
      (i) => i.end_date > new Date() && i.payment_status === "successful"
    );
  }

  static async validateSubscriptionStatus(
    userId: string
  ): Promise<IApiResponse<null>> {
    const rows = (
      await Subscription.findAll({ where: { user_id: userId } })
    ).map((i) => i.toJSON()) as any as ISubscription[];

    if (rows.length === 0) {
      return {
        status: "error",
        error_code: "SUBSCRIPTION_NOT_FOUND",
      };
    }

    const filterValidSubs = rows.filter(
      (i) => i.end_date > new Date() && i.payment_status === "successful"
    );

    if (filterValidSubs.length === 0) {
      return {
        status: "error",
        error_code: "SUBSCRIPTION_NOT_FOUND",
      };
    }

    return {
      status: "ok",
    };
  }

  static async getActiveSubscriptions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const rows = (
      await Subscription.findAll({
        where: {
          user_id: req.__user__!.id,
          payment_status: "successful",
          end_date: { [Op.gt]: new Date() }, // active subscriptions
        },
      })
    ).map((i) => i.toJSON()) as ISubscription[];

    res.ok({ data: { rows, pagination: req.__pagination__! } });
  }

  static async getSubscriptionPlanPricing(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    res.ok({ data: PRICING });
  }

  static async getSubscriptionDiscount(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const code = req.params.discount_code as string;

    const validDiscount = await validateDiscountFromCode(code);
    if (validDiscount.status === "error") {
      return next(ApiError.fromValidation(validDiscount.message));
    }

    res.ok({ data: validDiscount.data! });
  }

  static async verifySubscriptionPayment(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const trxRef = req.query.transaction_ref as string;
    const sub = (
      await Subscription.findOne({ where: { payment_transaction_ref: trxRef } })
    )?.toJSON();

    if (!sub) {
      return next(
        ApiError.fromValidation("Could not validate subscription payment")
      );
    }

    const f = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${trxRef}`,
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          "content-type": "application/json",
          accept: "application/json",
        },
      }
    );
    const fetchPayment = (await f.json()) as FlutterwaveTransaction;

    if (fetchPayment.status !== "success") {
      return next(
        ApiError.fromValidation("Could not validate subscription payment ref")
      );
    }

    await Subscription.update(
      {
        payment_status: fetchPayment.data.status,
      },
      { where: { payment_transaction_ref: trxRef } }
    );

    // Usage
    res.ok({
      message: getPaymentMessage(fetchPayment.data.status),
      data: {
        payment_status: fetchPayment.data.status,
      },
    });
  }

  static async createSubscription(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const body = req.body as ICreateSubscriptionSchema;

    const user = getUserFromCaller(req);

    const activeSubs = await SubscriptionController.getActiveSubs(user.user_id);

    if (activeSubs.length > 0) {
      return next(
        ApiError.fromConflict(
          "An active subscription already exist for this account"
        )
      );
    }

    let subscriptionAmountSummary: {
      amount: number;
      discount_value: number;
      final_amount: number;
    } = calculateAmount(body.plan, body.billing_cycle, 0);

    let subscriptionDiscount: ISubscriptionDiscount | null = null;

    const startDate = new Date();
    if (body.discount_code) {
      const validDiscount = await validateDiscountFromCode(body.discount_code);
      if (validDiscount.status === "error") {
        return next(ApiError.fromValidation(validDiscount.message));
      }
      subscriptionDiscount = validDiscount.data as ISubscriptionDiscount;

      subscriptionAmountSummary = calculateAmount(
        body.plan,
        body.billing_cycle,
        validDiscount.data!.discount_percentage
      );
    }

    const transactionRef = uuid();

    const findUser = (await User.findByPk(user.user_id, {
      attributes: ["email", "full_name"],
    })) as any as Pick<IUser, "email" | "full_name">;

    await sequelize.transaction(async (t) => {
      await Subscription.create(
        {
          amount: subscriptionAmountSummary.amount,
          billing_currency: "usd",
          billing_cycle: body.billing_cycle,
          is_discount_applied: false,
          is_trial: false,
          user_id: user.user_id,
          start_date: new Date(),
          end_date: getSubscriptionEndDate(
            startDate,
            body.billing_cycle,
            body.plan
          ),
          discount_id: subscriptionDiscount?.id,
          discount_value: subscriptionAmountSummary.discount_value,
          final_amount: subscriptionAmountSummary.final_amount,
          plan: body.plan,
          payment_gateway: "flutterwave",
          payment_transaction_ref: transactionRef,
          payment_status: "pending",
        },
        { transaction: t }
      );

      if (subscriptionDiscount) {
        const updatedRedemptionTimes = subscriptionDiscount.times_redeemed
          ? subscriptionDiscount.times_redeemed + 1
          : 1;
        await SubscriptionDiscount.update(
          {
            times_redeemed: updatedRedemptionTimes,
          },
          { where: { id: subscriptionDiscount.id }, transaction: t }
        );
      }
    });

    res.ok({
      message: "Subscription created",
      data: {
        user: {
          email: findUser.email,
          full_name: findUser.full_name,
        },

        subscription: {
          billing_cycle: body.billing_cycle,
          plan: body.plan,
          is_discount_applied: false,
          amount: subscriptionAmountSummary.amount,
          discount_value: subscriptionAmountSummary.discount_value,
          final_amount: subscriptionAmountSummary.final_amount,
          is_trial: false,
          payment_transaction_ref: transactionRef,
        },
      },
    });
  }
}

function getSubscriptionEndDate(
  startDate: Date,
  billingCycle: SubscriptionBillingCycle,
  plan: SubscriptionPlans
): Date {
  const endDate = new Date(startDate);

  if (billingCycle === "weekly") {
    endDate.setDate(endDate.getDate() + 7);
  } else if (billingCycle === "monthly") {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return endDate;
}

export function calculateAmount(
  plan: SubscriptionPlans,
  billing_cycle: SubscriptionBillingCycle,
  discountPercentage: number = 0
): {
  amount: number;
  discount_value: number;
  final_amount: number;
} {
  let amount = 0;

  if (plan === "pro") {
    if (billing_cycle === "monthly") amount = PRICING.pro.monthly;
    if (billing_cycle === "weekly") amount = PRICING.pro.weekly;
  }

  if (plan === "team") {
    if (billing_cycle === "monthly") amount = PRICING.team.monthly;
    if (billing_cycle === "weekly") amount = PRICING.team.weekly;
  }

  const discount_value =
    discountPercentage > 0 ? (amount * discountPercentage) / 100 : 0;

  const final_amount = amount - discount_value;

  return {
    amount,
    discount_value,
    final_amount,
  };
}

async function validateDiscountFromCode(
  code?: string
): Promise<IApiResponse<ISubscriptionDiscount>> {
  const discount = (await SubscriptionDiscount.findOne({
    where: { code },
  })) as any as ISubscriptionDiscount;

  if (!discount) {
    return {
      status: "error",
      message: "Discount code expired or is invalid",
    };
  }

  if (discount.expiration_date && discount.expiration_date < new Date()) {
    return {
      status: "error",
      message: "Discount code expired",
    };
  }

  if (
    discount.max_redemptions &&
    discount.times_redeemed &&
    discount.times_redeemed >= discount.max_redemptions
  ) {
    return {
      status: "error",
      message: "Discount code has reached its usage limit",
    };
  }

  return { status: "ok", data: discount };
}
const getPaymentMessage = (status: string) => {
  const messages = {
    successful: "🎉 Payment successful! Your premium access is now unlocked",
    failed:
      "❌ Payment failed. Please try again or use a different payment method",
    pending:
      "⏳ Payment processing... Your subscription will activate once confirmed",
    reversed:
      "↩️ Payment reversed. Please contact support if this is unexpected",
    timeout: "⏰ Payment timed out. Please try again",
    cancelled: "🚫 Payment cancelled. No charges were made to your account",
    queued: "📥 Payment queued. Processing may take a few moments",
    incomplete: "⚠️ Payment incomplete. Please finish the payment process",
  };

  return messages[status as keyof typeof messages] || "Payment status unknown";
};
