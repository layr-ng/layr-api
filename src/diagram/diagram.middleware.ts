import { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors";
import Diagram from "./diagram.model";
import DiagramParticipant from "./participant.model";
import TeamDiagram from "../team/teamDiagram.model";
import TeamMember from "../team/teamMember.model";
import SubscriptionController from "../subscription/subscription.controller";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class DiagramAuthorization {
  private static readonly WRITE_METHODS: HttpMethod[] = [
    "POST",
    "PUT",
    "PATCH",
  ];
  private static readonly ADMIN_METHODS: HttpMethod[] = ["DELETE"];

  static async isAuthorizedToAccessDiagram(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const diagramId = req.params.diagram_id;

      const authorizedUser = req.__user__!;

      const diagram = (await Diagram.findByPk(diagramId, {
        attributes: ["id", "creator_id"],
        rejectOnEmpty: true,
      })) as any as IDiagram;

      if (diagram.creator_id === authorizedUser!.id) {
        return next();
      }

      // Check if diagram belongs to any team(s)
      const teamDiagrams = (await TeamDiagram.findAll({
        where: { diagram_id: diagramId },
        attributes: ["team_id"],
        raw: true,
      })) as any as ITeamDiagram[];

      if (teamDiagrams.length > 0) {
        // Get all team_ids the diagram belongs to
        const teamIds = teamDiagrams.map((tr) => tr.team_id);

        // Check if user is a member of any of those teams
        const teamMember = (await TeamMember.findOne({
          where: {
            team_id: teamIds,
            user_id: authorizedUser.id,
          },
          attributes: ["role", "team_id"],
          raw: true,
        })) as any as ITeamMember;

        if (teamMember) {
          const method = req.method.toUpperCase() as HttpMethod;

          if (DiagramAuthorization.ADMIN_METHODS.includes(method)) {
            if (teamMember.role !== "owner") {
              return next(
                ApiError.fromForbidden(
                  "Owner privileges required for team diagram"
                )
              );
            }
          }

          if (DiagramAuthorization.WRITE_METHODS.includes(method)) {
            if (teamMember.role === "viewer") {
              return next(
                ApiError.fromForbidden("Write access required for team diagram")
              );
            }
          }

          return next();
        }
      }

      // Fallback: check if user is a direct participant
      const participant = (await DiagramParticipant.findOne({
        where: {
          user_id: authorizedUser!.id,
          diagram_id: diagramId,
        },
        attributes: ["role"],
        rejectOnEmpty: false,
      })) as any as IDiagramParticipant;

      if (!participant) {
        return next(ApiError.fromForbidden("No access to this diagram"));
      }

      const method = req.method.toUpperCase() as HttpMethod;

      if (DiagramAuthorization.ADMIN_METHODS.includes(method)) {
        if (participant.role !== "admin") {
          return next(ApiError.fromForbidden("Admin privileges required"));
        }
      }

      if (DiagramAuthorization.WRITE_METHODS.includes(method)) {
        if (participant.role === "viewer") {
          return next(ApiError.fromForbidden("Write access required"));
        }
      }

      next();
    } catch (error) {
      next(ApiError.fromInternalError("Authorization check failed"));
    }
  }

  static async checkMaxDiagramSharableLinks(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const activeSubs = await SubscriptionController.getActiveSubs(
      req.__user__!.id
    );

    if (activeSubs.length === 0) {
      const totalVisibleDiagrams = await Diagram.count({
        where: { creator_id: req.__user__!.id, visibility: "public" },
      });
      if (totalVisibleDiagrams === 1) {
        return next(
          ApiError.error(
            "SOLO_PLAN_LIMIT_EXCEEDED",
            "Free Plan limit reached: you can only make up to 1 diagrams public for sharing. Upgrade to Pro to unlock unlimited shareable links."
          )
        );
      }
    }

    next();
  }

  static async checkDiagramCreationLimit(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const activeSubs = await SubscriptionController.getActiveSubs(
      req.__user__!.id
    );

    if (activeSubs.length === 0) {
      const totalDiagrams = await Diagram.count({
        where: { creator_id: req.__user__!.id },
      });

      if (totalDiagrams === 3) {
        return next(
          ApiError.error(
            "SOLO_PLAN_LIMIT_EXCEEDED",
            "You’ve reached the 3-diagram limit on the Free Plan. Upgrade to Pro for unlimited diagrams."
          )
        );
      }
    }
    next();
  }
}
