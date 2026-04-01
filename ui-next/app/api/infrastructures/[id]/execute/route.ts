import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { infrastructures, variables } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import { extractHostnamesFromTfstate } from "@/lib/inventory";
import { jsonError, requireApiUser } from "@/lib/api-utils";
import { loadRunnerSettings, RunnerConfigurationError, sendRunnerPayload } from "@/lib/runner";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { user, response } = await requireApiUser(request);
  if (response) return response;

  const { id } = await params;

  // Verify infrastructure exists and user has access
  const infra = await db.query.infrastructures.findFirst({
    where: and(eq(infrastructures.id, id), eq(infrastructures.uid, user!.id)),
  });
  if (!infra) return jsonError("Infrastructure not found", 404);

  const body = await request.json();
  const action = body.action as string | undefined;
  if (!action) {
    return jsonError("action is required", 400);
  }

  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) {
    console.error("[execute] AUTH_SECRET missing");
    return jsonError("AUTH_SECRET is missing", 500);
  }

  try {
    let settings;
    try {
      settings = await loadRunnerSettings(user!.id, "infrastructures", secret);
    } catch (err) {
      if (err instanceof RunnerConfigurationError) {
        return jsonError(err.message, err.status);
      }
      throw err;
    }

    // 2. Get tfstate - try variables table first, then infrastructure column
    let tfstateRaw: string | null = null;

    const tfstateVar = await db.query.variables.findFirst({
      where: and(
        eq(variables.uid, user!.id),
        eq(variables.type, "tfstate"),
        eq(variables.key, id),
      ),
    });

    if (tfstateVar) {
      const decrypted = decrypt(tfstateVar.value, secret);
      tfstateRaw = decrypted;
    }

    if (!tfstateRaw) {
      return jsonError("No tfstate found for this infrastructure", 400);
    }

    // 3. Extract hostnames from tfstate
    const hostnames = extractHostnamesFromTfstate(tfstateRaw);
    if (hostnames.length === 0) {
      return jsonError("No hosts found in tfstate", 400);
    }

    // 4. Forge payload
    // Format: instance.location.region.provider.project
    // Example: server1.us-west.us.aws.production
    // Project is the last segment
    const project = hostnames[0]?.split(".").pop() ?? "unknown";

    const payload = {
      meta: { hosts: hostnames.join(",") },
      project,
      type: `paas-${action}`,
      confirmation: "yes",
    };

    // 5. Send to runner
    try {
      const runner = await sendRunnerPayload(settings, payload);

      if (!runner.ok) {
        console.error("[execute] Runner returned error", {
          status: runner.status,
          body: runner.errorText,
        });
        return jsonError(`Runner error: ${runner.status} ${runner.errorText}`, runner.status);
      }

      return NextResponse.json({
        ok: true,
        message: `Operation '${action}' sent to runner for '${infra.name}'`,
        infrastructure: { id, name: infra.name },
        action,
        hostCount: hostnames.length,
        runnerResponse: runner.runnerResponse,
      });
    } catch (err) {
      console.error("[execute] Failed to call runner", {
        error: err instanceof Error ? err.message : String(err),
        url: settings.url,
      });
      return jsonError(`Failed to reach runner: ${err instanceof Error ? err.message : "Unknown error"}`, 503);
    }
  } catch (err) {
    console.error("[execute] Unexpected error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonError("Internal server error", 500);
  }
}
