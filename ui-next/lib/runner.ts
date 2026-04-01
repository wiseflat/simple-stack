import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { variables } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import { safeJsonParse } from "@/lib/api-utils";

export type RunnerSettings = {
  url?: string;
  authentication?: boolean;
  login?: string;
  password?: string;
  instance?: string;
};

export class RunnerConfigurationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function loadRunnerSettings(uid: string, settingsKey: string, secret: string) {
  const userScoped = await db.query.variables.findFirst({
    where: and(eq(variables.uid, uid), eq(variables.type, "settings"), eq(variables.key, settingsKey)),
  });

  const shared =
    userScoped ??
    (await db.query.variables.findFirst({
      where: and(isNull(variables.uid), eq(variables.type, "settings"), eq(variables.key, settingsKey)),
    }));

  if (!shared) {
    throw new RunnerConfigurationError(
      `Runner settings not configured (type=settings, key=${settingsKey})`,
      400,
    );
  }

  const decrypted = decrypt(shared.value, secret);
  if (!decrypted) {
    throw new RunnerConfigurationError("Unable to decrypt runner settings", 500);
  }

  const settings = safeJsonParse<RunnerSettings>(decrypted, {});
  if (!settings.url) {
    throw new RunnerConfigurationError("Runner URL not configured in settings", 400);
  }

  return settings;
}

export async function sendRunnerPayload(settings: RunnerSettings, payload: unknown) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (settings.authentication && settings.login && settings.password) {
    const basicAuth = Buffer.from(`${settings.login}:${settings.password}`).toString("base64");
    headers["Authorization"] = `Basic ${basicAuth}`;
  }

  const response = await fetch(settings.url!, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    return {
      ok: false as const,
      status: response.status,
      errorText: bodyText,
      runnerResponse: null,
    };
  }

  const rawBody = await response.text();
  let runnerResponse: unknown = null;
  if (rawBody.trim()) {
    try {
      runnerResponse = JSON.parse(rawBody);
    } catch {
      runnerResponse = rawBody;
    }
  }

  return {
    ok: true as const,
    status: response.status,
    errorText: "",
    runnerResponse,
  };
}
