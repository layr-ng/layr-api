import { CookieOptions } from "express";
import { CLIENT_URL, NODE_ENV } from "./config";

export const AuthCookieName = "sTk";

export const BrandInfo = {
  name: "Layr",
  domain: "yourdomain.com",
};

export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  domain: CLIENT_URL,
  maxAge: 1440 * 60 * 1000, // 60 minutes
  signed: true,
};
export enum ErrorCodes {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  CONFLICT = "CONFLICT",
  PENDING_PAYMENT = "PENDING_PAYMENT",
  NEW_DEVICE_DETECTED = "NEW_DEVICE_DETECTED",
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
}
