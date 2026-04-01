import { z } from "zod";

export const UserCreateSchema = z.object({
  first_name: z.string().regex(/^[A-Za-z\-\s]{3,50}$/, "name: 3-50 chars"),
  last_name: z.string().regex(/^[A-Za-z\-\s]{3,50}$/, "name: 3-50 chars"),
  email: z.string().email("Invalid email"),
  language: z.enum(["en", "fr", "es", "sk"]).optional().default("en"),
  password: z
    .string()
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}.*$/,
      "Minimum eight characters, at least one letter and one number",
    ),
  token: z
    .string()
    .regex(/^[\w_]{64}$/, "Invalid token")
    .optional()
    .default(""),
  isdisabled: z.boolean().optional().default(false),
  sa: z.boolean().optional().default(false),
});

export const UserUpdateSchema = z.object({
  first_name: z.string().regex(/^[A-Za-z\-\s]{3,50}$/, "name: 3-50 chars"),
  last_name: z.string().regex(/^[A-Za-z\-\s]{3,50}$/, "name: 3-50 chars"),
  email: z.string().email("Invalid email"),
  language: z.enum(["en", "fr", "es", "sk"]).optional(),
  password: z
    .string()
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}.*$/,
      "Minimum eight characters, at least one letter and one number",
    )
    .optional(),
  token: z
    .string()
    .regex(/^[\w_]{64}$/, "Invalid token")
    .optional(),
  sa: z.boolean().optional(),
  isdisabled: z.boolean().optional(),
  isinactive: z.boolean().optional(),
  notifications: z.boolean().optional(),
});

export const UserProfileUpdateSchema = z.object({
  first_name: z.string().regex(/^[A-Za-z\-\s]{3,50}$/, "name: 3-50 chars"),
  last_name: z.string().regex(/^[A-Za-z\-\s]{3,50}$/, "name: 3-50 chars"),
  email: z.string().email("Invalid email"),
  language: z.enum(["en", "fr", "es", "sk"]),
});

export const PasswordUpdateSchema = z.object({
  password: z
    .string()
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}.*$/,
      "Minimum eight characters, at least one letter and one number",
    ),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});
