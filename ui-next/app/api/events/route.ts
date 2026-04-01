import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema";
import { jsonError, requireApiUser } from "@/lib/api-utils";

export async function GET(request: Request) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  const rows = await db.select().from(events).orderBy(asc(events.timestamp));
  const mapped = rows.reverse().map((item) => ({
    type: item.status === "success" ? "info" : "warning",
    body: `${item.timestamp ?? ""} - ${item.message ?? ""}`,
  }));
  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  const body = (await request.json()) as {
    event_type?: string;
    status?: string;
    message?: string;
    timestamp?: string;
    playbook?: unknown;
    stats?: unknown;
    hosts_details?: unknown;
  };

  if (!body.status || !body.message) {
    return jsonError("status and message are required", 400);
  }

  await db.insert(events).values({
    id: randomUUID(),
    eventType: body.event_type ?? "",
    status: body.status,
    message: body.message,
    timestamp: new Date().toLocaleString("fr-FR"),
    payload: JSON.stringify(body),
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { response } = await requireApiUser(request);
  if (response) return response;

  await db.delete(events);
  return NextResponse.json({ ok: true });
}
