import { Router } from "express";
import { catchAsync } from "../errors";
import DiagramController from "./diagram.controller";
import AuthController from "../auth/auth.controller";
import { setPaginationParameters } from "../helpers";
import { DiagramAuthorization } from "./diagram.middleware";
import { validateRequest } from "../middleware";
import {
  UpdateDiagramSchema,
  UpdateGroupSchema,
  PromptDiagramSequenceSchema,
  UpdateSequenceFromHistorySchema,
  UpdateDiagramSequenceSchema,
} from "./diagram.schema";

const diagramRouter = Router();
export const groupRouter = Router();

diagramRouter
  .route("/public")
  .get(catchAsync(DiagramController.getPublicDiagrams));

diagramRouter
  .route("/share/view")
  .get(catchAsync(DiagramController.getPubliclySharedDiagram));

diagramRouter.use(AuthController.verifyAuth("user"));

diagramRouter.param(
  "diagram_id",
  catchAsync(DiagramAuthorization.isAuthorizedToAccessDiagram)
);

diagramRouter
  .route("/")
  .get(
    setPaginationParameters,
    catchAsync(DiagramController.getAllUserDiagrams)
  )
  .post(
    catchAsync(DiagramAuthorization.checkDiagramCreationLimit),
    catchAsync(DiagramController.createDiagram)
  );

diagramRouter
  .route("/owned")
  .get(
    setPaginationParameters,
    catchAsync(DiagramController.getUserOwnedDiagrams)
  );

diagramRouter
  .route("/shared")
  .get(
    setPaginationParameters,
    catchAsync(DiagramController.getDiagramsSharedWithUser)
  );

diagramRouter
  .route("/:diagram_id")
  .get(catchAsync(DiagramController.getDiagram))
  .patch(
    validateRequest(UpdateDiagramSchema),
    catchAsync(DiagramController.updateDiagram)
  )
  .delete(catchAsync(DiagramController.deleteDiagram));

diagramRouter
  .route("/:diagram_id/sequence")
  .patch(
    validateRequest(UpdateDiagramSequenceSchema),
    catchAsync(DiagramController.updateDiagramSequence)
  );
diagramRouter
  .route("/:diagram_id/sequence/prompt")
  .post(
    validateRequest(PromptDiagramSequenceSchema),
    catchAsync(DiagramController.promptDiagramSequence)
  );

diagramRouter
  .route("/:diagram_id/visibility/public")
  .patch(
    catchAsync(DiagramAuthorization.checkMaxDiagramSharableLinks),
    catchAsync(DiagramController.makeDiagramPublic)
  );

diagramRouter
  .route("/:diagram_id/visibility/hidden")
  .patch(catchAsync(DiagramController.makeDiagramHidden));

diagramRouter
  .route("/:diagram_id/thumbnail")
  .patch(catchAsync(DiagramController.saveDiagramThumbnail));

diagramRouter
  .route("/:diagram_id/group")
  .post(catchAsync(DiagramController.addDiagramToGroup));

diagramRouter
  .route("/:diagram_id/participant/:user_id")
  .post(catchAsync(DiagramController.addParticipants))
  .delete(catchAsync(DiagramController.deleteParticipant));

diagramRouter
  .route("/:diagram_id/participant")
  .get(setPaginationParameters, catchAsync(DiagramController.getParticipants));

groupRouter
  .route("/")
  .post(catchAsync(DiagramController.createGroup))
  .get(setPaginationParameters, catchAsync(DiagramController.getGroups));

groupRouter
  .route("/:group_id")
  .get(catchAsync(DiagramController.getGroup))
  .patch(
    validateRequest(UpdateGroupSchema),
    catchAsync(DiagramController.updateGroup)
  )
  .delete(catchAsync(DiagramController.deleteGroup));

groupRouter
  .route("/:group_id/diagram")
  .get(catchAsync(DiagramController.getGroupDiagrams));

export default diagramRouter;
