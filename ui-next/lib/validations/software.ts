import { z } from "zod";

const DOMAIN_REGEX =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,15}$/;

const DomainAliasSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) return true;

    const aliases = value
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean);

    if (!aliases.length) return true;
    return aliases.every((alias) => DOMAIN_REGEX.test(alias));
  }, "Invalid domain alias");

export const SoftwareCreateSchema = z.object({
  instance: z.string().min(1, "instance required"),
  software: z.string().min(1, "software required"),
  size: z.enum(["tiny", "small", "medium", "large", "xxl"]),
  domain: z.string().regex(DOMAIN_REGEX, "Invalid domain"),
  domain_alias: DomainAliasSchema,
  exposition: z.enum(["none", "public", "public-unmanaged", "private"]),
});

export const SoftwareUpdateSchema = z.object({
  instance: z.string().min(1, "instance required"),
  software: z.string().min(1, "software required"),
  size: z.enum(["tiny", "small", "medium", "large", "xxl"]),
  domain: z.string().regex(DOMAIN_REGEX, "Invalid domain"),
  domain_alias: DomainAliasSchema,
  exposition: z.enum(["none", "public", "public-unmanaged", "private"]),
});

export const SoftwareVersionUpdateSchema = z.object({
  version: z.string().min(1, "version required"),
});

export const SoftwareExecuteSchema = z.object({
  action: z.enum([
    "start",
    "stop",
    "main",
    "backup",
    "restore",
    "destroy",
    "destroy_force",
    "destroy_backup",
    "update",
    "renew",
    "reconfigure",
    "pull",
  ]),
});
