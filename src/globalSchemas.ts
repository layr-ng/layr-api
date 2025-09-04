import { z } from "zod";
import { phone } from "phone";

export const EmailSchema = z
  .string({ message: "Enter email to proceed" })
  .email("Invalid email format");

export const PhoneNumberSchema = z.string().refine(
  (value) => {
    const result = phone(value);
    return result.isValid;
  },
  (value) => {
    const result = phone(value);
    if (!result.isValid) {
      return {
        message: `Invalid phone number: no matching country found`,
      };
    }
    if (!result.countryIso2) {
      return {
        message: "Invalid phone number: country code is missing or incorrect",
      };
    }
    return { message: "Valid phone number" }; // This won't trigger, as only invalid numbers reach here.
  }
);

export const FullNameSchema = z
  .string()
  .refine((name) => name.trim().split(" ").length === 2, {
    message: "Full name must contain both first and last name",
  });

export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*(),.?":{}|<>]/,
    "Password must contain at least one special character"
  );

export const CurrencyValidator = z.string();

export const Login2FAVerificationSchema = z
  .object({
    code: z.string().min(6, "Invalid 2fa code"),
    email: EmailSchema,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const ChangePasswordSchema = z
  .object({
    old_password: PasswordSchema,
    new_password: PasswordSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const ResetPasswordSchema = z
  .object({
    slug: z.string({ required_error: "Invalid reset password link" }),
    password: PasswordSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const GetResetPasswordLinkSchema = z
  .object({
    email: EmailSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });
