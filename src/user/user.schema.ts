import { z } from "zod";
import { EmailSchema, FullNameSchema, PasswordSchema } from "../globalSchemas";

export const RegisterUserSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    full_name: FullNameSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export type RegisterBody = z.infer<typeof RegisterUserSchema>;
