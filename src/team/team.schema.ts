import { z } from "zod";
import { EmailSchema } from "../globalSchemas";

export const UpdateTeamSchema = z
  .object({
    title: z
      .string({ required_error: "Team title is required" })
      .min(5, "Title must be more than 5 characters"),
    description: z
      .string()
      .min(5, "Description must be more than 5 characters")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const CreateTeamSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const AddDiagramsToTeam = z
  .object({
    diagram_ids: z
      .array(
        z
          .string({ required_error: "Diagram ID is required" })
          .uuid("Each diagram ID must be a valid UUID"),
        { required_error: "Diagram IDs are required" }
      )
      .min(1, "At least one diagram ID must be provided"),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const UpdateTeamMemberRoleSchema = z
  .object({
    role: z.enum(["viewer", "editor", "admin"], {
      message: "Role is required",
      required_error: "Role is required to proceed",
    }),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const AddTeamMemberSchema = z
  .object({
    role: z.enum(["viewer", "editor", "admin"], {
      message: "Role is required",
      required_error: "Role is required to proceed",
    }),
    email: EmailSchema,
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const UpdateTeamInvitationStatus = z
  .object({
    status: z.enum(["accept", "decline", "verify"], {
      message: "status is required",
      required_error: "status is required to proceed",
    }),
    sId: z.string({ required_error: "Invalid invitation link" }),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export type UpdateTeamBody = z.infer<typeof UpdateTeamSchema>;
export type CreateTeamBody = z.infer<typeof CreateTeamSchema>;
export type AddTeamMemberBody = z.infer<typeof AddTeamMemberSchema>;

export type AddDiagramsToTeamBody = z.infer<typeof AddDiagramsToTeam>;
export type IUpdateTeamInvitationStatus = z.infer<
  typeof UpdateTeamInvitationStatus
>;

export type IUpdateTeamMemberRoleSchema = z.infer<
  typeof UpdateTeamMemberRoleSchema
>;
