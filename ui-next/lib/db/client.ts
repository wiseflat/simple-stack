import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

const sqlitePath = process.env.DATABASE_URL ?? "./data/simple-stack.db";

if (sqlitePath !== ":memory:" && !sqlitePath.startsWith("file:")) {
	const dir = path.dirname(sqlitePath);
	if (dir && dir !== "." && !fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

const sqlite = new Database(sqlitePath);

export const db = drizzle(sqlite, { schema });
