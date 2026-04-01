import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { settings as settingsTable } from "@/lib/db/schema";

const SETTINGS_ROW_ID = "global";

export type SiteSettings = {
  enablePublicLanding: boolean;
  enableDocumentation: boolean;
};

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  enablePublicLanding: true,
  enableDocumentation: true,
};

async function ensureSettingsTable() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      enable_public_landing INTEGER NOT NULL DEFAULT 1,
      enable_documentation INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    )
  `);
}

async function ensureSettingsRow() {
  const existing = await db.query.settings.findFirst({
    where: eq(settingsTable.id, SETTINGS_ROW_ID),
  });

  if (existing) return existing;

  const now = new Date();
  await db.insert(settingsTable).values({
    id: SETTINGS_ROW_ID,
    enablePublicLanding: DEFAULT_SITE_SETTINGS.enablePublicLanding,
    enableDocumentation: DEFAULT_SITE_SETTINGS.enableDocumentation,
    createdAt: now,
    updatedAt: now,
  });

  return db.query.settings.findFirst({
    where: eq(settingsTable.id, SETTINGS_ROW_ID),
  });
}

export async function getSiteSettings(): Promise<SiteSettings> {
  await ensureSettingsTable();
  const row = await ensureSettingsRow();

  return {
    enablePublicLanding: row?.enablePublicLanding ?? DEFAULT_SITE_SETTINGS.enablePublicLanding,
    enableDocumentation: row?.enableDocumentation ?? DEFAULT_SITE_SETTINGS.enableDocumentation,
  };
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  await ensureSettingsTable();
  await ensureSettingsRow();

  await db
    .update(settingsTable)
    .set({
      ...(patch.enablePublicLanding !== undefined ? { enablePublicLanding: patch.enablePublicLanding } : {}),
      ...(patch.enableDocumentation !== undefined ? { enableDocumentation: patch.enableDocumentation } : {}),
      updatedAt: new Date(),
    })
    .where(eq(settingsTable.id, SETTINGS_ROW_ID));

  return getSiteSettings();
}
