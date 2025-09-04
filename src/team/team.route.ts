import { Router } from "express";
import * as TeamController from "./team.controller";
import { catchAsync } from "../errors";
import AuthController from "../auth/auth.controller";
import { setPaginationParameters } from "../helpers";
import * as TeamMiddleware from "./team.middleware";
import { validateIdParam, validateRequest } from "../middleware";
import { AddDiagramsToTeam, AddTeamMemberSchema } from "./team.schema";
import { SubscriptionMiddleware } from "../subscription/subscription.middleware";

const teamRouter = Router();
teamRouter.param("team_id", validateIdParam("team_id"));
teamRouter.param("user_id", validateIdParam("user_id"));
teamRouter.param("diagram_id", validateIdParam("diagram_id"));
teamRouter.use(
  AuthController.verifyAuth("user"),
  SubscriptionMiddleware.validateUserSubscription
);

teamRouter
  .route("/invitation/status")
  .post(catchAsync(TeamController.handleTeamInvitationUpdate));

teamRouter
  .route("/")
  .post(catchAsync(TeamController.createTeam))
  .get(setPaginationParameters, catchAsync(TeamController.getUserTeams));

teamRouter
  .route("/:team_id")
  .get(TeamMiddleware.teamAuthorization(), catchAsync(TeamController.getTeam))
  .delete(
    TeamMiddleware.teamAuthorization(["owner"]),
    catchAsync(TeamController.deleteTeam)
  )
  .patch(
    TeamMiddleware.teamAuthorization(["owner", "admin"]),
    catchAsync(TeamController.updateTeam)
  );

teamRouter
  .route("/:team_id/member")
  .post(
    validateRequest(AddTeamMemberSchema),
    TeamMiddleware.teamAuthorization(["owner", "admin"]),
    catchAsync(TeamController.sendInvite)
  )
  .delete(catchAsync(TeamController.leaveTeam));

teamRouter
  .route("/:team_id/member/:user_id")
  .delete(
    TeamMiddleware.teamAuthorization(["owner", "admin"]),
    catchAsync(TeamController.removeTeamMember)
  );

teamRouter
  .route("/:team_id/member/:user_id/role")
  .put(
    validateRequest(AddTeamMemberSchema),
    TeamMiddleware.teamAuthorization(["owner", "admin"]),
    catchAsync(TeamController.sendInvite)
  );

teamRouter
  .route("/:team_id/diagram")
  .post(
    TeamMiddleware.teamAuthorization(["owner", "admin"]),
    validateRequest(AddDiagramsToTeam),
    catchAsync(TeamController.addDiagramToTeam)
  );

teamRouter
  .route("/:team_id/diagram/:diagram_id")
  .delete(
    TeamMiddleware.teamAuthorization(["owner", "admin"]),
    catchAsync(TeamController.removeDiagramFromTeam)
  );

export default teamRouter;
