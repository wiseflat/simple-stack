import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  tokenHash: text("token_hash"),
  language: text("language").default("fr"),
  isDisabled: integer("is_disabled", { mode: "boolean" }).default(false),
  isInactive: integer("is_inactive", { mode: "boolean" }).default(false),
  isRemoved: integer("is_removed", { mode: "boolean" }).default(false),
  sa: integer("sa", { mode: "boolean" }).default(false),
  notifications: integer("notifications", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const catalogs = sqliteTable("catalogs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  alias: text("alias"),
  description: text("description"),
  documentation: text("documentation"),
  version: text("version"),
  origin: text("origin"),
  suffix: text("suffix"),
  cron: integer("cron", { mode: "boolean" }).default(false),
  crontab: text("crontab"),
  dockerfileRoot: text("dockerfile_root"),
  dockerfileNonroot: text("dockerfile_nonroot"),
  fork: integer("fork", { mode: "boolean" }).default(false),
  forkable: integer("forkable", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const infrastructures = sqliteTable("infrastructures", {
  id: text("id").primaryKey(),
  uid: text("uid").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  isArchived: integer("is_archived", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const softwares = sqliteTable("softwares", {
  id: text("id").primaryKey(),
  uid: text("uid").notNull(),
  softwareId: text("software_id"),
  domain: text("domain"),
  domainAlias: text("domain_alias"),
  exposition: text("exposition"),
  version: text("version"),
  size: text("size"),
  instance: text("instance"),
  status: integer("status", { mode: "boolean" }).default(true),
  state: integer("state"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const variables = sqliteTable("variables", {
  id: text("id").primaryKey(),
  uid: text("uid"),
  key: text("key").notNull(),
  key2: text("key2"),
  type: text("type").notNull(),
  value: text("value").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  eventType: text("event_type"),
  status: text("status"),
  message: text("message"),
  timestamp: text("timestamp"),
  payload: text("payload"),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  enablePublicLanding: integer("enable_public_landing", { mode: "boolean" }).notNull().default(true),
  enableDocumentation: integer("enable_documentation", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
