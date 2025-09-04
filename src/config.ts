import dotenv from "dotenv";
dotenv.config();
function getEnvVar(key: string, required = true): string {
  const val = process.env[key];
  if (!val && required) throw new Error(`Missing env var: ${key}`);
  return val || "";
}

export const ADMIN_EMAIL = getEnvVar("ADMIN_EMAIL");

export const TEAM_INVITE_SECRET = getEnvVar("TEAM_INVITE_SECRET");

export const NODE_ENV = getEnvVar("NODE_ENV") as "production" | "development";

export const BASE_URL =
  NODE_ENV === "development" ? "http://localhost:3000" : "https://server.com";

export enum AccountStatus {
  active = "active",
  inactive = "inactive",
  blocked = "blocked",
}

export const CLIENT_URL =
  NODE_ENV === "development" ? "http://localhost:5173" : "https://trugwo.com";

export const PORT = getEnvVar("PORT") ?? 3000;

export const PG_CONFIG = {
  port: getEnvVar("DB_PORT") as any as number,
  host: getEnvVar("DB_HOST"),
  dialect: "postgres",
  dialectOptions: {
    charset: "utf8mb4_unicode_ci",
  },
  database: getEnvVar("DB_NAME"),
  username: getEnvVar("DB_USER"),
  password: getEnvVar("DB_PASSWORD"),
};

export const JWT_AUTH_SECRET = getEnvVar("JWT_AUTH_SECRET");
export const COOKIE_SECRET = getEnvVar("COOKIE_SECRET");
export const ALLOWED_ORIGINS = getEnvVar("ALLOWED_ORIGINS")?.split(", ") ?? [];

export const MAIL_CONFIG = {
  user: getEnvVar("NO_REPLY_MAIL_USER"),
  pass: getEnvVar("NO_REPLY_MAIL_PASSWORD"),
  host: getEnvVar("MAIL_HOST"),
  port: getEnvVar("MAIL_PORT"),
};

export const FLUTTERWAVE_SECRET_KEY =
  NODE_ENV === "development"
    ? getEnvVar("FLUTTERWAVE_TEST_SECRET_KEY")
    : getEnvVar("FLUTTERWAVE_LIVE_SECRET_KEY");

export const FLUTTERWAVE_PUBLIC_KEY =
  NODE_ENV === "development"
    ? getEnvVar("FLUTTERWAVE_TEST_PUBLIC_KEY")
    : getEnvVar("FLUTTERWAVE_LIVE_PUBLIC_KEY");

export const CLOUDFLARE_ACCOUNT_ID = getEnvVar("CLOUDFLARE_ACCOUNT_ID");
export const CLOUDFLARE_ACCOUNT_API_TOKEN = getEnvVar(
  "CLOUDFLARE_ACCOUNT_API_TOKEN"
);
