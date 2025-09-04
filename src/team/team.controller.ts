import { Request, Response, NextFunction } from "express";
import User from "../user/user.model";
import { ApiError } from "../errors";
import { okResponse } from "../helpers";
import Team from "./team.model";
import TeamMember from "./teamMember.model";
import { sequelize } from "../sequelize";
import { Op } from "sequelize";
import type {
  AddDiagramsToTeamBody,
  AddTeamMemberBody,
  IUpdateTeamInvitationStatus,
  IUpdateTeamMemberRoleSchema,
} from "./team.schema";
import emailService from "../email/email.service";
import { CLIENT_URL, NODE_ENV, TEAM_INVITE_SECRET } from "../config";
import jwt from "jsonwebtoken";
import Diagram from "../diagram/diagram.model";
import TeamDiagram from "./teamDiagram.model";
import { TeamInvitationTemplate } from "../email/templates/team-invite";
type TeamSelectType = "summary" | "full" | "dashboard";
const TEAM_CREATOR_USER_INCLUSION = {
  model: User,
  as: "team_creator",
  attributes: ["id", "full_name", "picture"],
};

const TEAM_MEMBER_USER_INCLUSION = {
  model: User,
  as: "team_member",
  attributes: ["id", "full_name", "picture"],
};

const TEAM_MEMBERS_INCLUSION = {
  model: TeamMember,
  as: "team_members",
  where: {
    membership_status: "active",
    invitation_status: "accepted",
  },
  attributes: ["role", "date_added"],
  include: [TEAM_MEMBER_USER_INCLUSION],
};

const TEAM_DIAGRAMS_FLAT_INCLUSION = {
  model: TeamDiagram,
  as: "team_diagrams",
  attributes: ["date_added"],
  include: [
    {
      model: Diagram,
      include: {
        model: User,
        as: "creator",
        required: true,
        attributes: ["id", "full_name", "picture"],
      },
      as: "team_diagram",
      attributes: [
        "id",
        "title",
        "visibility",
        "thumbnail_url",
        "createdAt",
        "updatedAt",
      ],
    },
    {
      model: User,
      as: "team_diagram_author",
      attributes: ["id", "full_name", "picture"],
    },
  ],
};
export const buildTeamIncludes = (type: TeamSelectType): any[] => {
  const includes: any[] = [];

  if (type === "summary") {
    includes.push(TEAM_CREATOR_USER_INCLUSION);
  }

  if (type === "full") {
    includes.push(
      TEAM_CREATOR_USER_INCLUSION,
      TEAM_MEMBERS_INCLUSION,
      TEAM_DIAGRAMS_FLAT_INCLUSION
    );
  }

  return includes;
};

type TeamInvitationData = {
  teamName: string;
  inviterName: string;
  inviterAvatar?: string;
  role: string;
  isValid: boolean;
  error?: string;
};

export const updateTeamMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { team_id, user_id } = req.params;

  const reqBody = req.body as IUpdateTeamMemberRoleSchema;

  // const team

  // const u = await TeamMember.update({role: reqBody.role,}, {where: {team_id, user_id}})
};

export const handleTeamInvitationUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { status, sId } = req.body as IUpdateTeamInvitationStatus;

  if (!sId) {
    return next(ApiError.fromValidation("Missing secure invitation token."));
  }

  let decoded: { team_id: string; user_id: string };

  try {
    decoded = jwt.verify(sId, TEAM_INVITE_SECRET!) as typeof decoded;
  } catch (err) {
    return next(
      ApiError.fromUnauthorized("Invalid or expired invitation token.")
    );
  }

  const { user_id, team_id } = decoded;

  if (req.__user__!.id !== user_id) {
    return next(
      ApiError.fromUnauthorized(
        "You are not authorized to view, accept or decline this invitation."
      )
    );
  }

  try {
    const teamMember = (await TeamMember.findOne({
      raw: true,
      where: { team_id, user_id },
    })) as ITeamMember | null;

    if (!teamMember) {
      return next(ApiError.fromNotFound("Team invitation not found."));
    }
    if (teamMember.invitation_status === "accepted") {
      return next(
        ApiError.fromConflict("You have already accepted this invitation.")
      );
    }
    if (status === "verify") {
      const inviter = (await User.findByPk(teamMember.author_id!, {
        raw: true,
        attributes: ["full_name", "picture"],
      })) as Pick<IUser, "full_name" | "picture"> | null;

      const team = (await Team.findByPk(team_id, {
        raw: true,
        attributes: ["title"],
      })) as Pick<ITeam, "title"> | null;

      if (!inviter || !team) {
        return next(ApiError.fromNotFound("Team or inviter not found."));
      }

      const data: TeamInvitationData = {
        inviterName: inviter.full_name!,
        inviterAvatar: inviter.picture!,
        teamName: team.title,
        role: teamMember.role,
        isValid: true,
      };

      okResponse(res, { data });
      return;
    }

    if (status === "decline") {
      await TeamMember.destroy({
        where: { team_id, user_id },
      });
      okResponse(res);
      return;
    }

    const updateData: Partial<ITeamMember> = {
      invitation_status: status === "accept" ? "accepted" : "declined",
      membership_status: status === "accept" ? "active" : "inactive",
      date_joined: status === "accept" ? new Date() : null,
    };

    await TeamMember.update(updateData, {
      where: { team_id, user_id },
    });

    okResponse(res, { data: { team_id } });
  } catch (err) {
    console.error("Team invitation error:", err);
    return next(
      ApiError.fromInternalError("Failed to handle team invitation.")
    );
  }
};

export const leaveTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user_id = req.__user__!.id; // from auth middleware
  const { team_id } = req.params;

  const team = (await Team.findByPk(team_id, {
    attributes: ["creator_id"],
    raw: true,
  })) as any as ITeam;

  // Find the team member record
  const teamMember = (await TeamMember.findOne({
    where: { team_id, user_id },
    raw: true,
  })) as any as ITeamMember;

  if (!teamMember) {
    return next(
      ApiError.fromValidation(
        "You are not a member of this team or already left."
      )
    );
  }

  if (team.creator_id === user_id) {
    return next(
      ApiError.fromForbidden("Team creator cannot be removed from the team")
    );
  }

  await TeamMember.destroy({
    where: { team_id, user_id },
  });
  okResponse(res, {
    message: "You are no longer a member of the team.",
  });
};

// Create a new team
export const createTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { title, description } = req.body;
  const creator_id = req.__user__!.id;

  const acidic = await sequelize.transaction();

  try {
    const team = (await Team.create(
      {
        creator_id,
        title,
        description,
      },
      { returning: true, raw: true, transaction: acidic }
    )) as any as ITeam;

    await TeamMember.create(
      {
        role: "owner",
        team_id: team.id,
        user_id: creator_id,
        invitation_status: "accepted",
        author_id: null,
        membership_status: "active",
        date_joined: new Date(),
        date_added: new Date(),
      },
      { transaction: acidic }
    );
    await acidic.commit();
    okResponse(res, { data: { id: team.id } });
  } catch (err) {
    await acidic.rollback();
    next(ApiError.fromInternalError("Could not create team"));
  }
};

export const sendInvite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { team_id } = req.params;
    const { email, role } = req.body as AddTeamMemberBody;

    const normalizedEmail = email.trim().toLowerCase();

    const user = (await User.findOne({
      where: { email: normalizedEmail },
      raw: true,
    })) as any as IUser;

    if (!user) {
      return next(ApiError.fromValidation("User must be signed up"));
    }

    const inviteToken = jwt.sign(
      { team_id, user_id: user.id },
      TEAM_INVITE_SECRET!,
      {
        expiresIn: "7d",
      }
    );
    const link = `${CLIENT_URL}/accept_invite/teams/${inviteToken}`;
    if (NODE_ENV === "development") {
      console.log(link);
    }
    // Check for existing membership (even soft-deleted or left)
    const existingTeamMember = (await TeamMember.findOne({
      where: { team_id, user_id: user.id },
      raw: true,
    })) as any as ITeamMember;

    if (existingTeamMember) {
      if (existingTeamMember.membership_status === "blocked") {
        return next(
          ApiError.fromConflict(
            "User was previously blocked from this team and cannot be re-added."
          )
        );
      }

      if (
        existingTeamMember.membership_status === "active" &&
        existingTeamMember.invitation_status === "accepted" &&
        existingTeamMember.date_joined
      ) {
        return next(
          ApiError.fromConflict("User is already a member of the team.")
        );
      }

      if (existingTeamMember.role !== role) {
        await TeamMember.update(
          { role },
          { where: { team_id, user_id: user.id } }
        );
      }
    }

    await TeamMember.findOrCreate({
      defaults: {
        team_id,
        role,
        invitation_status: "invited",
        author_id: req.__user__!.id,
        user_id: user.id,
        membership_status: "inactive",
        date_invited: new Date(),
        date_added: new Date(),
      },
      where: {
        team_id,
        user_id: user.id,
      },
    });

    const team = (await Team.findByPk(team_id, {
      attributes: ["title"],
    })) as any as Pick<ITeam, "title">;

    const inviter = (await User.findByPk(req.__user__!.id, {
      raw: true,
      attributes: ["full_name"],
    })) as any as Pick<IUser, "full_name">;

    // Send invite
    emailService.sendEmail({
      receiver: email,
      subject: `You've been invited to join ${team.title}`,
      html: TeamInvitationTemplate({
        inviter_name: inviter.full_name!,
        team_name: team.title,
        invite_link: link,
      }),
    });

    okResponse(res, { message: "An invitation mail has been sent to member." });
  } catch (error) {
    console.error("addTeamMember error:", error);
    return next(ApiError.fromInternalError("Could not send invitation link."));
  }
};

// Remove a user from a team
export const removeTeamMember = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { team_id, user_id } = req.params;

  const team = (await Team.findByPk(team_id, {
    attributes: ["creator_id"],
    raw: true,
  })) as any as Pick<ITeam, "creator_id">;

  if (team.creator_id === user_id) {
    return next(
      ApiError.fromForbidden("Team creator cannot be removed from the team")
    );
  }

  await TeamMember.destroy({
    where: { team_id, user_id },
  });
  okResponse(res, {
    message: "The user has been successfully removed from the team.",
  });
};

// List teams for user
export const getUserTeams = async (req: Request, res: Response) => {
  const user_id = req.__user__!.id;

  let rows = await TeamMember.findAll({
    where: {
      user_id,
      invitation_status: "accepted",
      membership_status: "active",
    },
  });

  const newRows = rows.map((i) => i.toJSON());

  const teamRows = await Team.findAll({
    limit: req.__pagination__!.page_size,
    offset: req.__pagination__!.offset,
    where: {
      id: {
        [Op.in]: newRows.map((i) => i.team_id),
      },
    },
    order: [["updatedAt", "DESC"]],
    include: buildTeamIncludes("summary"),
  });

  // Now enrich each team with total_diagrams and total_members
  const enrichedRows = await Promise.all(
    teamRows.map(async (team: any) => {
      const [diagramCount, memberCount] = await Promise.all([
        TeamDiagram.count({ where: { team_id: team.id } }),
        TeamMember.count({
          where: {
            team_id: team.id,
          },
        }),
      ]);

      return {
        ...team.toJSON(), // convert Sequelize instance to plain object
        total_diagrams: diagramCount,
        total_members: memberCount,
      };
    })
  );

  // Final response
  const data = {
    rows: enrichedRows,
    pagination: req.__pagination__!,
  };

  okResponse(res, { data });
};

// Get team details (with members)
export const getTeam = async (req: Request, res: Response) => {
  const { team_id } = req.params;
  let data = (await Team.findByPk(team_id, {
    include: buildTeamIncludes("full"),
  })) as any;

  okResponse(res, { data });
};

// Add a diagram or group to a team (assume group is a set of diagrams)
export const addDiagramToTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { team_id } = req.params;
  const { diagram_ids } = req.body as AddDiagramsToTeamBody;

  // Check if any of the diagrams are already added to the team
  const existing = await TeamDiagram.findAll({
    where: {
      team_id,
      diagram_id: { [Op.in]: diagram_ids },
    },
    raw: true,
  });

  if (existing.length > 0) {
    return next(
      ApiError.fromConflict("One or more diagrams already added to team")
    );
  }

  // Bulk create team diagrams
  const teamDiagrams = diagram_ids.map((diagram_id) => ({
    diagram_id,
    team_id,
    author_id: req.__user__!.id,
    date_added: new Date(),
  }));

  await TeamDiagram.bulkCreate(teamDiagrams);

  okResponse(res, { message: "Diagrams added to team" });
};

// Remove a diagram from a team
export const removeDiagramFromTeam = async (req: Request, res: Response) => {
  const { team_id, diagram_id } = req.params;
  await TeamDiagram.destroy({
    where: { team_id, diagram_id },
  });
  okResponse(res, { message: "Diagram removed from team" });
};

// Update team (title, description)
export const updateTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { team_id } = req.params;
  const { title, description } = req.body;

  const team = {} as any;

  if (title !== undefined) team.title = title;
  if (description !== undefined) team.description = description;

  await Team.update(team, { where: { id: team_id } });

  okResponse(res);
};

// Delete team
export const deleteTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { team_id } = req.params;

  const team = await Team.findByPk(team_id);
  if (!team) return next(ApiError.fromNotFound("Team not found"));

  const acidic = await sequelize.transaction();

  try {
    await Team.destroy({ where: { id: team_id }, transaction: acidic });
    await TeamMember.destroy({ where: { id: team_id }, transaction: acidic });
    await TeamDiagram.destroy({ where: { id: team_id }, transaction: acidic });
    await acidic.commit();
  } catch (err) {
    await acidic.rollback();
  }
  okResponse(res, { message: "Team deleted" });
};
