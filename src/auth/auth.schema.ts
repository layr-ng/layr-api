import { z } from "zod";
import { EmailSchema, PasswordSchema } from "../globalSchemas";

export const LoginUserSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const RequestPasswordResetLinkSchema = z
  .object({
    email: EmailSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const ResetPasswordSchema = z
  .object({
    email: EmailSchema,
    token: z.string(),
    password: PasswordSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export type LoginBody = z.infer<typeof LoginUserSchema>;
