import { z } from "zod";

export const VariableCreateSchema = z.object({
  type: z.string().min(1, "type required"),
  key: z.string().min(1, "key required"),
  key2: z.string().optional(),
  value: z.string().optional().default(""),
});

export const VariableUpdateSchema = z.object({
  type: z.string().min(1, "type required"),
  key: z.string().min(1, "key required"),
  key2: z.string().optional(),
  value: z.string().optional().default(""),
});

export const VariableReadSchema = z.object({
  key: z.string().min(1),
  key2: z.string().optional(),
  type: z.string().min(1),
  format: z.enum(["yaml", "json"]).optional().default("json"),
});

export const VariableSecretSchema = z.object({
  type: z.string().min(1),
  key: z.string().min(1),
  subkey: z.string().optional(),
  missing: z.enum(["create", "warn", "error"]).optional(),
  nosymbols: z.boolean().optional().default(false),
  userpass: z.string().optional(),
  length: z.number().optional().default(100),
  overwrite: z.boolean().optional().default(false),
  delete: z.boolean().optional().default(false),
});
