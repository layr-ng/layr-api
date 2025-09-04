import { z } from "zod";

export const CreateSubscriptionSchema = z
  .object({
    billing_cycle: z.enum(["weekly", "monthly"]),
    plan: z.enum(["pro"]),
    discount_code: z.string().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export type ICreateSubscriptionSchema = z.infer<
  typeof CreateSubscriptionSchema
>;
