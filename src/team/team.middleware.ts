import { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors";
import Team from "./team.model";
import TeamMember from "./teamMember.model";

/**
 * Middleware to check if the user is a member of the team.
 * Optionally restricts to certain roles (e.g., "owner", "editor").
 * Usage: teamAuthorization(["owner", "editor"])
 */
export const teamAuthorization = (
  allowedRoles?: ("owner" | "editor" | "viewer" | "admin")[]
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { team_id } = req.params;
    const user = req.__user__;

    if (!team_id) {
      return next(ApiError.fromValidation("Team ID is required"));
    }
    if (!user || !user.id) {
      return next(ApiError.fromUnauthorized());
    }

    // Check if team exists
    const team = await Team.findByPk(team_id);
    if (!team) {
      return next(ApiError.fromNotFound("Team not found"));
    }

    // Check if user is a member of the team
    const member = (await TeamMember.findOne({
      where: {
        team_id,
        user_id: user.id,
        invitation_status: "accepted",
        membership_status: "active",
      },
      raw: true,
    })) as any as ITeamMember;

    if (!member) {
      return next(ApiError.fromForbidden("You are not a member of this team"));
    }

    // If allowedRoles is specified, check role
    if (allowedRoles && !allowedRoles.includes(member.role)) {
      return next(ApiError.fromForbidden("Insufficient team privileges"));
    }

    next();
  };
};

/**
 * Considerations:
 * - Use this middleware for all routes that modify or access a team or its resources.
 * - For destructive actions (update/delete team), restrict to "owner" role.
 * - For read-only actions, allow "viewer", "editor", or "owner".
 * - Attach team and membership info to req for use in controllers if needed.
 */
