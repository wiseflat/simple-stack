import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { catalogs } from "@/lib/db/schema";
import { jsonError, requireApiUser } from "@/lib/api-utils";
import { loadRunnerSettings, RunnerConfigurationError, sendRunnerPayload } from "@/lib/runner";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;

  const catalog = await db.query.catalogs.findFirst({ where: eq(catalogs.id, id) });
  if (!catalog) return jsonError("Catalog not found", 404);

  const body = await request.json().catch(() => ({}));
  const action = body.action as string | undefined;
  if (!action) {
    return jsonError("action is required", 400);
  }

  if (action !== "build") {
    return jsonError("Unsupported action", 400);
  }

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) {
    return jsonError("AUTH_SECRET is missing", 500);
  }

  try {
    let settings;
    try {
      settings = await loadRunnerSettings(user!.id, "catalogs", secret);
    } catch (err) {
      if (err instanceof RunnerConfigurationError) {
        return jsonError(err.message, err.status);
      }
      throw err;
    }

    if (!settings.instance) {
      return jsonError("Runner instance not configured in catalogs settings", 400);
    }

    const payload = {
      meta: { hosts: settings.instance },
      type: "saas-image",
      catalog_id: id,
    };

    try {
      const runner = await sendRunnerPayload(settings, payload);

      if (!runner.ok) {
        console.error("[catalog-execute] Runner returned error", {
          status: runner.status,
          body: runner.errorText,
        });
        return jsonError(`Runner error: ${runner.status} ${runner.errorText}`, runner.status);
      }

      return NextResponse.json({
        ok: true,
        message: `Operation '${action}' sent to runner for '${catalog.alias || catalog.name}'`,
        catalog: { id, name: catalog.alias || catalog.name },
        action,
        runnerResponse: runner.runnerResponse,
      });
    } catch (err) {
      return jsonError(
        `Failed to reach runner: ${err instanceof Error ? err.message : "Unknown error"}`,
        503,
      );
    }
  } catch (err) {
    console.error("[catalog-execute] Unexpected error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonError("Internal server error", 500);
  }
}
