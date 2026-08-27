import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { sql } from "../src/lib/db";

async function main() {
  const schemaPath = path.join(process.cwd(), "src/lib/db/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  // Neon's HTTP driver runs one statement per call, so the file is split on
  // `;` — safe here since the schema has no semicolons inside string/body
  // literals. Every statement is a `CREATE ... IF NOT EXISTS`, so re-running
  // this against an already-migrated database is a no-op.
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
    console.log(`ok: ${statement.split("\n")[0].slice(0, 70)}...`);
  }

  console.log(`migration complete (${statements.length} statements).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
