import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const classes = await pool.query(
    "SELECT id, name FROM classes ORDER BY id"
  );

  console.log("\n========== CLASSES ==========");
  console.table(classes.rows);

  const sections = await pool.query(
    "SELECT id, class_id, name FROM sections ORDER BY class_id, id"
  );

  console.log("\n========== SECTIONS ==========");
  console.table(sections.rows);

  const years = await pool.query(
    "SELECT id, name, status FROM academic_years"
  );

  console.log("\n========== ACADEMIC YEARS ==========");
  console.table(years.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
