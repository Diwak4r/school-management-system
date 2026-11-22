import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const { Client } = require("pg");

loadEnvConfig(process.cwd());

const client = new Client({
  connectionString:
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
});

const classList = [
  { name: "ECD", level: "ECD", sortOrder: 0 },
  { name: "Grade 1", level: "Primary", sortOrder: 1 },
  { name: "Grade 2", level: "Primary", sortOrder: 2 },
  { name: "Grade 3", level: "Primary", sortOrder: 3 },
  { name: "Grade 4", level: "Primary", sortOrder: 4 },
  { name: "Grade 5", level: "Primary", sortOrder: 5 },
  { name: "Grade 6", level: "Secondary", sortOrder: 6 },
  { name: "Grade 7", level: "Secondary", sortOrder: 7 },
  { name: "Grade 8", level: "Secondary", sortOrder: 8 },
  { name: "Grade 9", level: "Secondary", sortOrder: 9 },
  { name: "Grade 10", level: "Secondary", sortOrder: 10 },
];

try {
  await client.connect();
  await client.query("BEGIN");

  for (const item of classList) {
    await client.query(
      `INSERT INTO classes (name, level, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING`,
      [item.name, item.level, item.sortOrder]
    );
  }

  await client.query("COMMIT");

  const result = await client.query(
    "SELECT id, name, level, sort_order FROM classes ORDER BY sort_order"
  );

  console.table(result.rows);
  console.log("Total classes:", result.rowCount);
  console.log("Class setup completed successfully.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Setup failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
