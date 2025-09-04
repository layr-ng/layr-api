import { CLIENT_URL, MAIL_CONFIG } from "../config";
import { ApiError } from "../errors";
import { getClientInfo, okResponse } from "../helpers";
import emailService from "../email/email.service";
import { AuthCookieName } from "../constants";
import { Request, Response, NextFunction, CookieOptions } from "express";
import User from "../user/user.model";
import { compare, hash } from "bcrypt";
import { sign, verify } from "jsonwebtoken";
import Admin from "../admin/admin.model";

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  signed: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 24 * 3600 * 1000,
};

type EntitySession = {
  entityId: string;
  entityRole: string;
  ip: string;
  userAgent: string;
  authMethod: "local";
};

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const RESET_TOKEN_EXPIRY = "15m";
const SESSION_TOKEN_EXPIRY = "24h";

export default class AuthController {
  static resetPassword(entityRole: AuthEntity) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let entityModel: IAdmin | IUser | null = null;

      const { token, email, password } = req.body;

      try {
        const decoded = verify(token, JWT_SECRET) as { email: string };
        if (decoded.email !== email) {
          return next(ApiError.fromForbidden("Invalid reset token"));
        }

        if (entityRole === "admin") {
          entityModel = (
            await Admin.findOne({ where: { email } })
          )?.toJSON() as any as IAdmin;
        } else {
          entityModel = (
            await User.findOne({ where: { email } })
          )?.toJSON() as any as IUser;
        }
        if (!entityModel) {
          return next(
            ApiError.fromForbidden("No account associated with this email")
          );
        }

        if ((entityRole = "admin")) {
          await Admin.update(
            { password: await hash(password, 10) },
            { where: { email } }
          );
        } else {
          await User.update(
            { password: await hash(password, 10) },
            { where: { email } }
          );
        }

        res.ok({ message: "Password updated successfully" });
      } catch (error) {
        return next(ApiError.fromForbidden("Invalid or expired reset token"));
      }
    };
  }

  static requestResetPasswordLink(entityRole: AuthEntity) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const { email } = req.body;
      let entityModel: IAdmin | IUser | null = null;

      if (entityRole === "admin") {
        entityModel = (
          await Admin.findOne({ where: { email } })
        )?.toJSON() as any as IAdmin;
      } else {
        entityModel = (
          await User.findOne({ where: { email } })
        )?.toJSON() as any as IUser;
      }

      if (!entityModel) {
        res.ok({
          message:
            "If this email exists in our system, you will receive a password reset link",
        });
        return;
      }

      const resetToken = sign({ email: entityModel.email }, JWT_SECRET, {
        expiresIn: RESET_TOKEN_EXPIRY,
      });
      const resetLink = `${CLIENT_URL}/reset_password?token=${resetToken}&email=${email}`;

      const mailOptions = {
        from: MAIL_CONFIG.user,
        receiver: entityModel.email,
        subject: "Password Reset Request",
        html: `
          <p>You requested a password reset for your account.</p>
          <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      };

      await emailService.sendEmail(mailOptions);
      res.ok({ message: "Password reset link sent to your email" });
    };
  }

  static login(entityRole: AuthEntity) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let entityModel: IAdmin | IUser | null = null;

      if (entityRole === "admin") {
        entityModel = (
          await Admin.scope("withPassword").findOne({
            where: { email: req.body.email },
            attributes: ["password", "id"],
          })
        )?.toJSON() as any as IAdmin;
      } else {
        entityModel = (
          await User.scope("withPassword").findOne({
            where: { email: req.body.email },
            attributes: ["password", "id"],
          })
        )?.toJSON() as any as IUser;
      }

      if (!entityModel) {
        return next(ApiError.fromUnauthorized("Credentials are invalid"));
      }

      const isPass = await compare(req.body.password, entityModel.password!);
      if (!isPass) {
        return next(ApiError.fromUnauthorized("Credentials are invalid"));
      }

      const clientInfo = getClientInfo(req);

      const sessionData: EntitySession = {
        entityId: entityModel.id,
        entityRole: entityRole,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        authMethod: "local",
      };

      const sessionToken = sign(sessionData, JWT_SECRET, {
        expiresIn: SESSION_TOKEN_EXPIRY,
      });

      res.cookie(AuthCookieName, sessionToken, COOKIE_OPTIONS);
      okResponse(res, { message: "Login successful" });
    };
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    res.clearCookie(AuthCookieName);
    okResponse(res);
  }

  public static verifyAuth(entityRole: AuthEntity) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const token = req.signedCookies[AuthCookieName];

      if (!token) {
        return next(ApiError.fromUnauthorized());
      }

      try {
        const decoded = verify(token, JWT_SECRET) as EntitySession;

        if (entityRole === "admin") {
          req.__admin__ = { id: decoded.entityId };
          req.__caller__ = "admin";
        } else {
          req.__user__ = { id: decoded.entityId };
          req.__caller__ = "public";
        }

        next();
      } catch (error) {
        return next(ApiError.fromUnauthorized());
      }
    };
  }
}
