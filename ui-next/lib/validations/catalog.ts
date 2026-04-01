import { z } from "zod";

const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,79}$/;

export const CatalogCreateSchema = z.object({
  name: z
    .string()
    .regex(/^[a-zA-Z_0-9-]{3,50}$/, "name: 3-50 chars (letters, numbers, _, -)"),
  version: z.string().regex(VERSION_PATTERN, "Invalid version"),
  forkable: z.boolean(),
});

export const CatalogUpdateSchema = z.object({
  alias: z.string().regex(/^[\w\s]{3,30}$/, "alias: 3-30 chars"),
  description: z
    .string()
    .regex(/^[\w\s,]{5,200}$/, "description: 5-200 chars"),
  documentation: z
    .string()
    .regex(
      /^(http|https):\/\/[\w\-]+(\.[\w\-]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?$/,
      "Invalid URL",
    )
    .optional()
    .or(z.literal("")),
  cron: z.boolean(),
  crontab: z
    .string()
    .regex(
      /^(0|[1-5]?[0-9]|[*]) (0?[1-9]|1[0-9]|2[0-3]|[*]) (0?[1-9]|[12][0-9]|3[01]|[*]) (0?[1-9]|1[0-2]|[*]) (0?[0-6]|[*])$/,
      "Invalid crontab",
    ),
});

export const CatalogForkCreateSchema = z.object({
  origin: z.string().min(1),
  version: z.string().regex(VERSION_PATTERN, "Invalid version"),
  suffix: z.string().min(1),
  alias: z.string().regex(/^[\w\s]{3,30}$/, "alias: 3-30 chars"),
  description: z
    .string()
    .regex(/^[\w\s,]{5,200}$/, "description: 5-200 chars"),
  cron: z.boolean(),
  crontab: z
    .string()
    .regex(
      /^(0|[1-5]?[0-9]|[*]) (0?[1-9]|1[0-9]|2[0-3]|[*]) (0?[1-9]|[12][0-9]|3[01]|[*]) (0?[1-9]|1[0-2]|[*]) (0?[0-6]|[*])$/,
      "Invalid crontab",
    ),
  dockerfile_root: z.string(),
  dockerfile_nonroot: z.string(),
});

export const CatalogForkUpdateSchema = z.object({
  origin: z.string().min(1),
  suffix: z.string().min(1),
  alias: z.string().regex(/^[\w\s]{3,30}$/, "alias: 3-30 chars"),
  description: z
    .string()
    .regex(/^[\w\s,]{5,200}$/, "description: 5-200 chars"),
  cron: z.boolean(),
  crontab: z
    .string()
    .regex(
      /^(0|[1-5]?[0-9]|[*]) (0?[1-9]|1[0-9]|2[0-3]|[*]) (0?[1-9]|[12][0-9]|3[01]|[*]) (0?[1-9]|1[0-2]|[*]) (0?[0-6]|[*])$/,
      "Invalid crontab",
    ),
  dockerfile_root: z.string(),
  dockerfile_nonroot: z.string(),
});
