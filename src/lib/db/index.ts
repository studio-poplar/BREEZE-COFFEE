import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Single shared connection. `globalThis` cache avoids opening a new
// file handle on every Next.js dev hot-reload.
declare global {
  var __grooveDb: Database.Database | undefined;
}

const DB_PATH =
  process.env.DATABASE_FILE ?? path.join(process.cwd(), "data", "groove-coffee.db");

function createConnection(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(path.join(process.cwd(), "src/lib/db/schema.sql"), "utf-8");
  db.exec(schema);
  return db;
}

export const db = globalThis.__grooveDb ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  globalThis.__grooveDb = db;
}
