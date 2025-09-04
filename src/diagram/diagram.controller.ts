import { NextFunction, Request, Response } from "express";
import { ApiError } from "../errors";
import { sequelize } from "../sequelize";
import Diagram from "./diagram.model";
import {
  getUserFromCaller,
  okResponse,
  parseFieldsAndFiles,
  uploadImagesToVPS,
} from "../helpers";
import User from "../user/user.model";
import Group from "./group.model";
import DiagramParticipant from "./participant.model";
import Notification from "../notification/notification.model";
import { Op } from "sequelize";
import {
  IPromptDiagramSequenceSchema,
  IUpdateDiagramSequenceSchema,
  UpdateDiagramBody,
  UpdateGroupBody,
} from "./diagram.schema";
import { CLOUDFLARE_ACCOUNT_API_TOKEN, CLOUDFLARE_ACCOUNT_ID } from "../config";

export const USER_IN_DIAGRAM_INCLUSION = [
  {
    model: User,
    as: "creator",
    required: true,
    attributes: ["id", "full_name", "picture"],
  },
];

const GROUP_INCLUSION = [
  {
    model: Group,
    as: "group",
    required: false,
    attributes: ["id", "title", "description"],
  },
];

const USER_IN_PARTICIPANT_INCLUSION = [
  {
    model: User,
    as: "info",
    attributes: ["id", "full_name", "picture"],
  },
];

const FULL_DIAGRAM_INCLUSION_OBJECT = [
  ...USER_IN_DIAGRAM_INCLUSION,
  ...GROUP_INCLUSION,
  {
    model: DiagramParticipant,
    as: "participants",
    attributes: ["user_id", "role", "is_creator"],
    include: USER_IN_PARTICIPANT_INCLUSION,
  },
];
const samplePublicDiagrams = [
  {
    title: "Customer Support Ticket Workflow",
    sequence: `
Customer->Website: submits support ticket
Website->Support System: create new ticket
Support System->Slack: notify support team
Support Agent->Support System: claim ticket
Support System->Customer: "Alex is now assisting you"
Support Agent->Customer: responds with solution
Customer->Support Agent: confirms issue is resolved
Support Agent->Support System: close ticket
    `.trim(),
  },
  {
    title: "Online Course Enrollment",
    sequence: `
User->Course Website: clicks "Buy Course"
Course Website->Payment Gateway: initiate payment
Payment Gateway->Bank: process card payment
Bank->Payment Gateway: payment success
Payment Gateway->Course Website: confirm purchase
Course Website->User Account: enroll user in course
User Account->User: "You're enrolled!"
    `.trim(),
  },
  {
    title: "Food Delivery Order Flow",
    sequence: `
Customer->Mobile App: places food order
Mobile App->Restaurant: new order notification
Restaurant->Kitchen: start preparing food
Restaurant->Delivery App: assign delivery rider
Rider->Restaurant: arrives for pickup
Restaurant->Rider: hand over food
Rider->Customer: deliver order
Customer->Mobile App: leave a review
    `.trim(),
  },
  {
    title: "Event Registration and Check-In",
    sequence: `
Attendee->Event Page: registers for event
Event Page->Email System: send QR ticket
Email System->Attendee: deliver ticket
Attendee->Check-In App: scan QR code
Check-In App->Database: validate ticket
Database->Check-In App: ticket valid
Check-In App->Attendee: allow entry
    `.trim(),
  },
  {
    title: "Job Application Process",
    sequence: `
Candidate->Job Portal: applies for job
Job Portal->Recruiter: notify of new applicant
Recruiter->ATS: move to "review"
ATS->Recruiter: suggest interview
Recruiter->Candidate: invite to interview
Candidate->Recruiter: accepts interview
Recruiter->Calendar App: schedule meeting
Calendar App->Candidate: send invite
    `.trim(),
  },
  {
    title: "E-commerce Checkout Flow",
    sequence: `
Shopper->Product Page: clicks "Add to Cart"
Product Page->Cart System: add item
Shopper->Cart: proceeds to checkout
Cart->Payment Gateway: process payment
Payment Gateway->Bank: authorize payment
Bank->Payment Gateway: approved
Payment Gateway->Cart: payment confirmed
Cart->Fulfillment System: initiate delivery
    `.trim(),
  },
  {
    title: "Client Onboarding (Design Agency)",
    sequence: `
Client->Website Form: submits project inquiry
Website Form->CRM: create client lead
CRM->Project Manager: assign new lead
Project Manager->Client: schedules intro call
Client->Project Manager: joins call
Project Manager->Design Team: share brief
Design Team->Client: send proposal
Client->Design Team: approve proposal
    `.trim(),
  },
  {
    title: "Subscription Renewal Reminder",
    sequence: `
Scheduler->Billing System: check subscriptions
Billing System->CRM: fetch expiring accounts
CRM->Email Service: send renewal reminder
Email Service->User: "Your subscription ends soon!"
User->Billing Portal: renew subscription
Billing Portal->Payment Processor: process renewal
Payment Processor->Billing Portal: payment successful
Billing Portal->CRM: update subscription status
    `.trim(),
  },
  {
    title: "Parent-Teacher Conference Booking",
    sequence: `
Parent->School Portal: selects teacher & time
School Portal->Calendar System: reserve time slot
Calendar System->Teacher: notify of booking
Calendar System->Parent: confirm booking
Parent->School Portal: uploads notes
School Portal->Teacher: share notes
Teacher->Parent: confirms readiness
    `.trim(),
  },
  {
    title: "Startup Investor Pitch Process",
    sequence: `
Founder->Website: submits pitch deck
Website->CRM: log investor request
CRM->Startup Analyst: assign for review
Startup Analyst->Founder: requests call
Founder->Analyst: joins pitch call
Analyst->Partner Team: shares evaluation
Partner Team->CRM: mark as potential deal
CRM->Founder: follow-up with decision
    `.trim(),
  },
] as IDiagram[];
export default class DiagramController {
  static async promptDiagramSequence(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const diagram_id = req.params.diagram_id;
    const body = req.body as IPromptDiagramSequenceSchema;

    const existingDiagramSequence = (
      await Diagram.findByPk(diagram_id, { attributes: ["sequence"] })
    )?.toJSON()?.sequence as any as string | null;

    const previousPrompts = req.body.previous_prompts;

    const llmResponse = await promptWithGpt({
      existingSequence: existingDiagramSequence!,
      prompt: body.prompt,
      previousChats: previousPrompts as any,
    });

    if (llmResponse.error) {
      return next(ApiError.fromInternalError());
    }

    const messageBlock = llmResponse.output.find(
      (o) => o.role === "assistant" && o.type === "message"
    );

    const rawText = messageBlock?.content.find((c) => c.type === "output_text")
      ?.text;

    const parsed = rawText ? (JSON.parse(rawText) as SequenceResponse) : null;

    res.ok({
      data: {
        answer: parsed?.answer,
        sequence: parsed?.sequence,
      },
    });
  }

  static async getPublicDiagrams(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    okResponse(res, {
      data: {
        rows: samplePublicDiagrams,
        pagination: { page: 1, page_size: samplePublicDiagrams.length },
      },
    });
  }

  static async saveDiagramThumbnail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { diagram_id } = req.params;

    const { err, imageFiles } = await parseFieldsAndFiles(req);
    if (err) {
      next(ApiError.fromValidation(err.message));
      return;
    }
    if (imageFiles.length === 0) {
      next(ApiError.fromValidation("No image uploaded"));
      return;
    }
    const images = await uploadImagesToVPS(imageFiles as any, "diagrams");

    await Diagram.update(
      { thumbnail_updatedAt: new Date(), thumbnail_url: images[0] },
      { where: { id: diagram_id } }
    );

    okResponse(res, { message: "Thumbnail updated successfully" });
  }

  static async getPubliclySharedDiagram(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const id = req.query.id as string;

    const data = (await Diagram.scope("publiclyShared").findOne({
      where: {
        id,
        visibility: "public",
      },
    })) as any as IDiagram;

    if (!data) {
      return next(
        ApiError.fromNotFound(
          "This diagram is no longer available. It may have expired, been deleted, or is no longer shared publicly."
        )
      );
    }

    okResponse(res, { data });
  }

  static async deleteParticipant(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const diagramId = req.params.diagram_id;
    const userId = req.params.user_id;

    const authorisedUserId = req.__user__!.id;

    const diagram = (await Diagram.findByPk(diagramId, {
      attributes: ["creator_id"],
    })) as any as IDiagram;

    if (diagram.creator_id !== authorisedUserId) {
      return next(
        ApiError.fromForbidden(
          "Only the person who created this diagram can remove participants. If you believe you should be allowed to do this, please contact support, we’re here to help."
        )
      );
    }

    if (userId === diagram.creator_id) {
      return next(
        ApiError.fromForbidden(
          "Oops! You can’t delete the person who created this diagram. If you need help changing ownership, please contact our support team, we’re here to help!"
        )
      );
    }

    await DiagramParticipant.destroy({
      where: { user_id: userId, diagram_id: diagramId },
    });

    okResponse(res);
  }

  static async updateParticipantRole(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // const
  }

  static async getParticipants(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const diagramId = req.params.diagram_id;
    const rows = await DiagramParticipant.findAll({
      where: { diagram_id: diagramId },
      include: USER_IN_PARTICIPANT_INCLUSION,
      limit: req.__pagination__!.page_size,
      offset: req.__pagination__!.offset,
    });

    okResponse(res, { data: { rows, pagination: req.__pagination__! } });
  }

  static async addParticipants(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const diagramId = req.params.diagram_id;
    const userId = req.params.user_id;

    const exists = await DiagramParticipant.count({
      where: { diagram_id: diagramId, user_id: userId },
    });

    if (exists > 0) {
      return next(ApiError.fromValidation("User is already a participant"));
    }

    const userWhoAdded = User.findByPk(req.__user__!.id, {
      attributes: ["full_name"],
    }) as any as IUser;

    const diagram = (await Diagram.findByPk(diagramId, {
      attributes: ["title"],
    })) as any as IDiagram;

    const transaction = await sequelize.transaction();

    try {
      await DiagramParticipant.create(
        {
          role: "editor",
          user_id: userId,
          is_creator: false,
          diagram_id: diagramId,
        },
        {
          transaction,
        }
      );

      await Notification.create(
        {
          title: `${userWhoAdded.full_name} added you to a diagram - ${diagram.title}`,
          type: "diagram.participant.new",
          status: "unread" as any,
          user_id: userId,
        },
        {
          transaction,
        }
      );
      await transaction.commit();
      okResponse(res);
    } catch (err: any) {
      await transaction.rollback();
      next(ApiError.fromInternalError());
    }
  }

  static async getGroup(req: Request, res: Response, next: NextFunction) {
    okResponse(res, { data: await Group.findByPk(req.params.group_id) });
  }

  static async deleteGroup(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();

    try {
      const group = await Group.findByPk(req.params.group_id, {
        transaction,
      });

      if (!group) {
        return next(ApiError.fromNotFound("Group not found"));
      }

      await Diagram.update(
        { group_id: null as any },
        { where: { group_id: req.params.group_id }, transaction }
      );

      await Group.destroy({
        where: {
          id: req.params.group_id,
          creator_id: getUserFromCaller(req).user_id,
        },
        transaction,
      });

      await transaction.commit();
      okResponse(res);
    } catch (err) {
      await transaction.rollback();
      next(ApiError.fromInternalError("Could not complete request"));
    }
  }

  static async updateGroup(req: Request, res: Response, next: NextFunction) {
    const { description, title } = req.body as UpdateGroupBody;

    const data = {} as UpdateDiagramBody;

    if (description) data.description = description;
    if (title) data.title = title;

    await Group.update(
      { ...data },
      {
        where: {
          id: req.params.group_id,
          creator_id: getUserFromCaller(req).user_id,
        },
      }
    );
    okResponse(res);
  }

  static async getGroups(req: Request, res: Response, next: NextFunction) {
    const rows = await Group.findAll({
      limit: req.__pagination__!.page_size,
      where: {
        creator_id: getUserFromCaller(req).user_id,
      },
      offset: req.__pagination__!.offset,
    });

    okResponse(res, {
      data: {
        rows,
        pagination: req.__pagination__!,
      },
    });
  }

  static async getGroupDiagrams(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const data = await Group.findOne({
      where: {
        id: req.params.group_id,
        creator_id: getUserFromCaller(req).user_id,
      },
      include: [...USER_IN_DIAGRAM_INCLUSION],
    });

    if (!data) {
      return next(ApiError.fromNotFound("Group not found"));
    }

    okResponse(res, { data });
  }

  static async createGroup(req: Request, res: Response, next: NextFunction) {
    const { title, description } = req.body;
    const group = await Group.create({
      title,
      description,
      creator_id: getUserFromCaller(req).user_id,
    });
    okResponse(res, { data: group });
  }

  static async addDiagramToGroup(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { group, diagram } = req.body;

    await Diagram.update({ group_id: group.id }, { where: { id: diagram.id } });
    okResponse(res);
  }

  static async deleteDiagram(req: Request, res: Response, next: NextFunction) {
    await Diagram.destroy({
      where: {
        id: req.params.diagram_id,
        creator_id: getUserFromCaller(req).user_id,
      },
    });
    okResponse(res);
  }

  static async getDiagramsSharedWithUser(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const rows = await DiagramParticipant.findAll({
      where: { user_id: getUserFromCaller(req).user_id, is_creator: false },
    });

    const newRows = rows.map((i) => i.toJSON());

    const data = {
      rows: await Diagram.findAll({
        limit: req.__pagination__!.page_size,
        offset: req.__pagination__!.offset,
        where: {
          id: {
            [Op.in]: newRows.map((i) => i.diagram_id), // Use $in operator to match IDs in the array
          },
        },
        include: FULL_DIAGRAM_INCLUSION_OBJECT,
      }),
      pagination: req.__pagination__!,
    };

    okResponse(res, {
      data,
    });
  }

  static async getAllUserDiagrams(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    let rows = await DiagramParticipant.findAll({
      where: { user_id: getUserFromCaller(req).user_id },
    });

    const newRows = rows.map((i) => i.toJSON());

    const data = {
      rows: await Diagram.findAll({
        limit: req.__pagination__!.page_size,
        offset: req.__pagination__!.offset,
        where: {
          id: {
            [Op.in]: newRows.map((i) => i.diagram_id),
          },
        },
        order: [["updatedAt", "DESC"]],

        include: FULL_DIAGRAM_INCLUSION_OBJECT,
      }),
      pagination: req.__pagination__!,
    };

    okResponse(res, {
      data,
    });
  }

  static async getUserOwnedDiagrams(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    let rows = await DiagramParticipant.findAll({
      where: { user_id: getUserFromCaller(req).user_id, is_creator: true },
    });

    const newRows = rows.map((i) => i.toJSON());

    const data = {
      rows: await Diagram.findAll({
        limit: req.__pagination__!.page_size,
        offset: req.__pagination__!.offset,
        where: {
          id: {
            [Op.in]: newRows.map((i) => i.diagram_id),
          },
        },
        include: FULL_DIAGRAM_INCLUSION_OBJECT,
        order: [["updatedAt", "DESC"]],
      }),
      pagination: req.__pagination__!,
    };

    okResponse(res, {
      data,
    });
  }

  static async getDiagram(req: Request, res: Response, next: NextFunction) {
    okResponse(res, {
      data: await Diagram.findByPk(req.params.diagram_id, {
        include: FULL_DIAGRAM_INCLUSION_OBJECT,
      }),
    });
  }

  static async makeDiagramPublic(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    await Diagram.update(
      { visibility: "public" },
      { where: { id: req.params.diagram_id } }
    );
    okResponse(res, { data: req.body });
  }

  static async makeDiagramHidden(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    await Diagram.update(
      { visibility: "hidden" },
      { where: { id: req.params.diagram_id } }
    );
    okResponse(res, { data: req.body });
  }

  static async updateDiagramSequence(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const body = req.body as IUpdateDiagramSequenceSchema;

    const diagram = (
      await Diagram.findByPk(req.params.diagram_id)
    )?.toJSON() as any as IDiagram;

    if (!diagram) throw new Error("Diagram not found");

    await Diagram.update(
      { sequence: body.sequence },
      { where: { id: req.params.diagram_id } }
    );

    res.ok();
  }

  static async updateDiagram(req: Request, res: Response, next: NextFunction) {
    const { description, title, visibility } = req.body as UpdateDiagramBody;

    const data = {} as Partial<
      Pick<IDiagram, "visibility" | "title" | "description">
    >;

    if (description) data.description = description;
    if (title) data.title = title;
    if (visibility) data.visibility = visibility;

    await Diagram.update({ ...data }, { where: { id: req.params.diagram_id } });
    okResponse(res, { data: req.body });
  }

  static async getDiagrams(req: Request, res: Response, next: NextFunction) {
    const data = {
      rows: await Diagram.findAll({
        limit: req.__pagination__!.page_size,
        offset: req.__pagination__!.offset,
        order: [["updatedAt", "DESC"]],
      }),
      pagination: req.__pagination__!,
    };

    okResponse(res, { data });
  }

  static async createDiagram(req: Request, res: Response, next: NextFunction) {
    const user = getUserFromCaller(req);
    const transaction = await sequelize.transaction();
    try {
      const diagram = (await Diagram.create(
        {
          title: "Untitled diagram",
          sequence: "",
          creator_id: getUserFromCaller(req).user_id,
          visibility: "hidden",
          thumbnail_updatedAt: null,
          thumbnail_url: null,
        },
        { returning: true, transaction }
      )) as any as IDiagram;
      await DiagramParticipant.create(
        {
          diagram_id: diagram.id,
          role: "admin",
          user_id: user.user_id,
          is_creator: true,
        },
        { transaction }
      );
      await transaction.commit();
      okResponse(res, { data: diagram });
    } catch (err: any) {
      await transaction.rollback();
      next(ApiError.fromInternalError("Error"));
    }
  }
}
const systemRules = `
You are a Sequence Diagram Assistant. 
You MUST always return ONLY a valid JSON object with the following exact structure:

{
  "answer": "<reply to the user in natural language>",
  "sequence": "<full DSL sequence as a single string, or '' if unchanged/none>"
}

## Rules:
1. Strictly output valid JSON. No extra text, no markdown formatting, no commentary outside the JSON.
2. "answer" should be a clear, human-readable response that addresses the user’s request.
3. "sequence" must always contain the ENTIRE sequence DSL text (not just the new part), or '' if no sequence is relevant.
4. The sequence must follow this DSL specification:
   - Comments start with "##".
   - Messages follow: participant arrow participant : message_text
   - Participants can be quoted ("...") or unquoted.
   - Arrows: "->" or "-->".
   - Whitespace around arrows and colons is optional.
5. If there is an existing sequence, update it accordingly while preserving valid DSL formatting.
6. If the user’s request does not require a sequence update, return the existing sequence unchanged.
7. Never invent participants or messages unless explicitly requested or implied by the user.
8. Always keep the DSL valid and consistent with previous steps.

## Examples:

User: "Alice says hi to Bob"
Response:
{
  "answer": "I added Alice greeting Bob.",
  "sequence": "Alice -> Bob: Hi"
}

User: "Add a database query from Client 1 to Database Node 2"
Existing sequence: 
Alice -> Bob: Hi
Response:
{
  "answer": "I added a query from Client 1 to Database Node 2.",
  "sequence": "Alice -> Bob: Hi\\nClient 1 -> \"Database Node 2\": Query"
}

User: "Just explain what this means"
Existing sequence: 
Alice -> Bob: Hi
Response:
{
  "answer": "This shows Alice sending a greeting message to Bob.",
  "sequence": "Alice -> Bob: Hi"
}
`;

type ResponseSchema = {
  error?: { code: string; message: string };

  id: string;
  created_at: number;
  model: string;
  object: "response";
  output: Array<
    | {
        id: string;
        type: "reasoning";
        content: Array<{ type: string; text?: string }>;
        summary: any[];
        status: string | null;
        role?: undefined;
      }
    | {
        id: string;
        type: "message";
        role: "assistant";
        content: Array<{ type: "output_text"; text: string }>;
        status: "completed";
      }
  >;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  status: "completed" | "failed";
  [key: string]: any; // for forward-compatibility
};
type SequenceResponse = {
  answer: string;
  sequence: string;
};
async function promptWithGpt({
  existingSequence,
  prompt,
  previousChats,
}: {
  existingSequence: string;
  prompt: string;
  previousChats: {
    prompt: string;
    model_response: string;
    new_sequence: string;
  }[];
}) {
  const payload = {
    model: "@cf/openai/gpt-oss-20b",
    input: [
      { role: "system", content: systemRules },
      { role: "user", content: prompt },
      { role: "system", content: `Existing sequence:\n${existingSequence}` },
      { role: "system", content: `Chat history:\n${previousChats}` },
    ],
    temperature: 0,
    top_p: 1,
    max_output_tokens: 1024,
    reasoning: { effort: "low" },
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "sequence_response",
        schema: {
          type: "object",
          properties: {
            answer: {
              type: "string",
              description: "Chatty but concise response",
            },
            sequence: {
              type: "string",
              description:
                "Partial, full, or omitted DSL sequence depending on context",
            },
          },
          required: ["answer"], // ⬅️ only answer is required
          additionalProperties: false,
        },
      },
    },
  };

  // 3. Call Cloudflare Workers AI
  const f = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1/responses `,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_ACCOUNT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  // 4. Parse response
  const llmResponse = (await f.json()) as ResponseSchema;
  return llmResponse;
}

/**
 * Cleans a model response to enforce JSON-only output with no reasoning text.
 * - Finds the first '{' and the last '}' and extracts that substring.
 * - Ensures it's valid JSON before returning.
 */
export function cleanModelResponse(
  raw: string
): { answer: string; sequence: string } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || start >= end) {
    return null; // no valid JSON found
  }

  const jsonString = raw.slice(start, end + 1);

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.error("Failed to parse cleaned JSON:", err);
    return null;
  }
}
