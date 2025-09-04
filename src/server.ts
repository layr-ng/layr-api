import express, { Response } from "express";
import { json, urlencoded } from "express";
import cookieParser from "cookie-parser";
import { ApiError } from "./errors";
import { COOKIE_SECRET, NODE_ENV, PORT } from "./config";
import { createServer } from "http";
import userRouter from "./user/user.route";
import diagramRouter from "./diagram/diagram.route";
import { errorHandler, morganConfig, responseMiddleware } from "./middleware";
import cors from "cors";
import notificationRouter from "./notification/notification.route";
import teamRouter from "./team/team.route";
import { join } from "path";
import subscriptionRouter from "./subscription/subscription.route";
import adminRouter from "./admin/admin.route";

const app = express();

const server = createServer(app);

app.use(
  cors({
    origin: "http://localhost:5173", // Ensure this matches the frontend's origin
    credentials: true, // Allow cookies to be sent with requests
  })
);
app.use(responseMiddleware);

app.use(cookieParser(COOKIE_SECRET)); // Ensure COOKIE_SECRET matches the signing secret
app.use(json({ limit: "5mb" }));
app.use(urlencoded({ extended: false }));
app.use(morganConfig());

app.use(express.static(join(__dirname, "../", "public")));
app.use(express.static(join(__dirname, "views/assets")));

app.use("/user", userRouter);
app.use("/admin", adminRouter);
app.use("/diagram", diagramRouter);
app.use("/notification", notificationRouter);
app.use("/team", teamRouter);
app.use("/subscription", subscriptionRouter);

app.get("/", (req, res) => res.end("</>") as any);

app.use(function (_req, res: Response, next) {
  next(ApiError.fromNotFound("Route not found"));
});

app.use(errorHandler);

server.listen(PORT, () => {
  NODE_ENV === "development"
    ? console.debug(`✅ http://localhost:${PORT}`)
    : console.debug("✅ " + PORT);
});
declare module "express" {
  interface Response {
    // Augmenting the Response type to expect ApiResponse
    json<DataType = any>(body: IApiResponse<DataType>): this;
  }
}
declare global {
  namespace Express {
    interface Response {
      ok: <T = any>(opts?: { message?: string; data?: T }) => Response;
    }
    export interface Request {
      __password_reset_session__?: {
        slug: string;
        email: string;
      };
      __pagination__?: IPagination;
      __user__?: {
        id: string;
      };
      __admin__?: {
        id: string;
      };
      __team_invitation__?: {
        team_id: string;
        user_id: string;
      };
      __caller__: "admin" | "public";
    }
  }
}
