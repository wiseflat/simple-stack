import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-utils";

const jsonObjectSchema = {
  type: "object",
  additionalProperties: true,
} as const;

const standardErrorResponses = {
  "401": { description: "Unauthorized" },
  "403": { description: "Forbidden" },
  "500": { description: "Internal Server Error" },
} as const;

const jsonRequestBody = {
  required: true,
  content: {
    "application/json": {
      schema: jsonObjectSchema,
    },
  },
} as const;

const internalOpenApi = {
  openapi: "3.1.0",
  info: {
    title: "Simple Stack Internal API",
    version: "1.0.0",
    description: "Internal reference for ui-next API routes.",
  },
  tags: [
    { name: "system" },
    { name: "account" },
    { name: "events" },
    { name: "graphs" },
    { name: "inventory" },
    { name: "catalogs" },
    { name: "softwares" },
    { name: "infrastructures" },
    { name: "variables" },
    { name: "users" },
    { name: "settings" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "authjs.session-token",
      },
      basicAuth: {
        type: "http",
        scheme: "basic",
      },
    },
  },
  security: [{ cookieAuth: [] }, { basicAuth: [] }],
  paths: {
    "/api/ping": {
      get: {
        tags: ["system"],
        summary: "Health check",
        responses: { "200": { description: "OK" } },
        security: [],
      },
    },
    "/api/account": {
      post: {
        tags: ["account"],
        summary: "Authenticate account-related request",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
    },
    "/api/events": {
      get: {
        tags: ["events"],
        summary: "List events",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      post: {
        tags: ["events"],
        summary: "Create event",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Created" }, ...standardErrorResponses },
      },
      delete: {
        tags: ["events"],
        summary: "Delete events",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Deleted" }, ...standardErrorResponses },
      },
    },
    "/api/graphs": {
      get: {
        tags: ["graphs"],
        summary: "Get graph data",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
    },
    "/api/inventory": {
      get: {
        tags: ["inventory"],
        summary: "Get inventory",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
    },
    "/api/catalogs": {
      get: {
        tags: ["catalogs"],
        summary: "List catalogs",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      post: {
        tags: ["catalogs"],
        summary: "Create catalog",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Created" }, ...standardErrorResponses },
      },
    },
    "/api/catalogs/{id}": {
      get: {
        tags: ["catalogs"],
        summary: "Get catalog by id",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      put: {
        tags: ["catalogs"],
        summary: "Update catalog by id",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Updated" }, ...standardErrorResponses },
      },
      delete: {
        tags: ["catalogs"],
        summary: "Delete catalog by id",
        responses: { "200": { description: "Deleted" }, ...standardErrorResponses },
      },
    },
    "/api/catalogs/{id}/fork": {
      post: {
        tags: ["catalogs"],
        summary: "Create fork from catalog",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Created" }, ...standardErrorResponses },
      },
      put: {
        tags: ["catalogs"],
        summary: "Update catalog fork",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Updated" }, ...standardErrorResponses },
      },
    },
    "/api/catalogs/{id}/execute": {
      post: {
        tags: ["catalogs"],
        summary: "Run catalog operation by id",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
    },
    "/api/softwares": {
      get: {
        tags: ["softwares"],
        summary: "List softwares",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      post: {
        tags: ["softwares"],
        summary: "Create software",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Created" }, ...standardErrorResponses },
      },
    },
    "/api/softwares/{id}": {
      get: {
        tags: ["softwares"],
        summary: "Get software by id",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      put: {
        tags: ["softwares"],
        summary: "Update software by id",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Updated" }, ...standardErrorResponses },
      },
      post: {
        tags: ["softwares"],
        summary: "Run software action by id",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      delete: {
        tags: ["softwares"],
        summary: "Delete software by id",
        responses: { "200": { description: "Deleted" }, ...standardErrorResponses },
      },
    },
    "/api/infrastructures": {
      get: {
        tags: ["infrastructures"],
        summary: "List infrastructures",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      post: {
        tags: ["infrastructures"],
        summary: "Create infrastructure",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Created" }, ...standardErrorResponses },
      },
    },
    "/api/infrastructures/{id}": {
      get: {
        tags: ["infrastructures"],
        summary: "Get infrastructure by id",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      put: {
        tags: ["infrastructures"],
        summary: "Update infrastructure by id",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Updated" }, ...standardErrorResponses },
      },
      delete: {
        tags: ["infrastructures"],
        summary: "Delete infrastructure by id",
        responses: { "200": { description: "Deleted" }, ...standardErrorResponses },
      },
    },
    "/api/infrastructures/{id}/tfstates": {
      get: {
        tags: ["infrastructures"],
        summary: "List terraform states for an infrastructure",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      post: {
        tags: ["infrastructures"],
        summary: "Create terraform state for an infrastructure",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Created" }, ...standardErrorResponses },
      },
    },
    "/api/variables": {
      get: {
        tags: ["variables"],
        summary: "List variables",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      post: {
        tags: ["variables"],
        summary: "Create variable",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Created" }, ...standardErrorResponses },
      },
    },
    "/api/variables/{id}": {
      get: {
        tags: ["variables"],
        summary: "Get variable by id",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      put: {
        tags: ["variables"],
        summary: "Update variable by id",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Updated" }, ...standardErrorResponses },
      },
      post: {
        tags: ["variables"],
        summary: "Run variable helper action",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      delete: {
        tags: ["variables"],
        summary: "Delete variable by id",
        responses: { "200": { description: "Deleted" }, ...standardErrorResponses },
      },
    },
    "/api/variables/secret": {
      post: {
        tags: ["variables"],
        summary: "Resolve a secret value",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
    },
    "/api/users": {
      get: {
        tags: ["users"],
        summary: "List users",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      post: {
        tags: ["users"],
        summary: "Create user",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Created" }, ...standardErrorResponses },
      },
    },
    "/api/users/{id}": {
      get: {
        tags: ["users"],
        summary: "Get user by id",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      put: {
        tags: ["users"],
        summary: "Update user by id",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Updated" }, ...standardErrorResponses },
      },
      delete: {
        tags: ["users"],
        summary: "Delete user by id",
        responses: { "200": { description: "Deleted" }, ...standardErrorResponses },
      },
    },
    "/api/users/profile": {
      get: {
        tags: ["users"],
        summary: "Get current user profile",
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
      put: {
        tags: ["users"],
        summary: "Update current user profile",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Updated" }, ...standardErrorResponses },
      },
    },
    "/api/users/password": {
      put: {
        tags: ["users"],
        summary: "Update current user password",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Updated" }, ...standardErrorResponses },
      },
    },
    "/api/settings/export": {
      post: {
        tags: ["settings"],
        summary: "Export settings data",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "OK" }, ...standardErrorResponses },
      },
    },
    "/api/settings/import": {
      post: {
        tags: ["settings"],
        summary: "Import settings data",
        requestBody: jsonRequestBody,
        responses: { "200": { description: "Imported" }, ...standardErrorResponses },
      },
    },
  },
} as const;

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const origin = new URL(request.url).origin;

  return NextResponse.json(
    {
      ...internalOpenApi,
      servers: [{ url: origin }],
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
