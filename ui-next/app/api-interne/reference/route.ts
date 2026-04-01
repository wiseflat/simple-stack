import { ApiReference } from "@scalar/nextjs-api-reference";
import { requireAdmin } from "@/lib/api-utils";

const scalarApiReference = ApiReference({
  pageTitle: "Simple Stack - API interne",
  url: "/api/openapi-internal",
  theme: "kepler",
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  return scalarApiReference();
}
