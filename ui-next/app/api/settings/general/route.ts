import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api-utils";
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings";

type SiteSettingsPayload = {
  enablePublicLanding?: unknown;
  enableDocumentation?: unknown;
};

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!user?.sa) return jsonError("Forbidden", 403);

  const data = await getSiteSettings();
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!user?.sa) return jsonError("Forbidden", 403);

  const body = (await request.json().catch(() => ({}))) as SiteSettingsPayload;

  const hasEnablePublicLanding = typeof body.enablePublicLanding === "boolean";
  const hasEnableDocumentation = typeof body.enableDocumentation === "boolean";

  if (!hasEnablePublicLanding && !hasEnableDocumentation) {
    return jsonError("At least one boolean setting is required", 400);
  }

  const updated = await updateSiteSettings({
    ...(hasEnablePublicLanding ? { enablePublicLanding: body.enablePublicLanding as boolean } : {}),
    ...(hasEnableDocumentation ? { enableDocumentation: body.enableDocumentation as boolean } : {}),
  });

  return NextResponse.json(updated);
}
