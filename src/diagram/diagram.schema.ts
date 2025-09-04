import { z } from "zod";

export const PromptDiagramSequenceSchema = z
  .object({
    prompt: z.string(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const UpdateSequenceFromHistorySchema = z
  .object({
    history_id: z.string().uuid(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const UpdateDiagramSequenceSchema = z
  .object({
    sequence: z.string().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const UpdateDiagramSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    visibility: z.enum(["public", "hidden"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export const UpdateGroupSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Request body cannot be empty",
  });

export type UpdateDiagramBody = z.infer<typeof UpdateDiagramSchema>;
export type UpdateGroupBody = z.infer<typeof UpdateGroupSchema>;
export type IPromptDiagramSequenceSchema = z.infer<
  typeof PromptDiagramSequenceSchema
>;
export type IUpdateSequenceFromHistorySchema = z.infer<
  typeof UpdateSequenceFromHistorySchema
>;
export type IUpdateDiagramSequenceSchema = z.infer<
  typeof UpdateDiagramSequenceSchema
>;
