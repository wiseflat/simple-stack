import { promises as fs } from "fs";
import path from "path";

const VALID_SCOPES = new Set(["paas", "saas"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scopeParam = searchParams.get("scope") ?? "paas";
    const scope = VALID_SCOPES.has(scopeParam) ? scopeParam : "paas";
    const filePath = path.join(process.cwd(), "public", `roles-variables-${scope}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    const rolesData = JSON.parse(content);

    return Response.json(rolesData);
  } catch (error) {
    console.error("Error loading roles variables:", error);
    return Response.json({ error: "Failed to load roles variables. Run 'npm run extract-roles' first." }, { status: 500 });
  }
}
