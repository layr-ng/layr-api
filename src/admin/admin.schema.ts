import { z } from "zod";
import { FullNameSchema, PasswordSchema } from "../globalSchemas";
import { ADMIN_EMAIL } from "../config";

const AdminEmailSchema = z.enum([ADMIN_EMAIL]);

export const CreateSubscriptionDiscountSchema = z
  .object({
    expiration_date: z.date(),
    max_redemptions: z.number(),
    discount_percentage: z.number(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const AdminRegistrationSchema = z
  .object({
    email: AdminEmailSchema,
    password: PasswordSchema,
    full_name: FullNameSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const AdminGetResetPasswordLinkSchema = z
  .object({
    email: AdminEmailSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const LoginAdminSchema = z
  .object({
    email: AdminEmailSchema,
    password: PasswordSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export type IAdminRegistrationSchema = z.infer<typeof AdminRegistrationSchema>;
export type IAdminGetResetPasswordLinkSchema = z.infer<
  typeof AdminGetResetPasswordLinkSchema
>;
export type ILoginAdminSchema = z.infer<typeof LoginAdminSchema>;
export type ICreateSubscriptionDiscountSchema = z.infer<
  typeof CreateSubscriptionDiscountSchema
>;
