import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const { Pool } = require("pg");

loadEnvConfig(process.cwd());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

try {
  console.log("\n========== ACTIVE ACADEMIC YEAR ==========");
  const year = await pool.query(
    "SELECT id, name, status FROM academic_years ORDER BY id"
  );
  console.table(year.rows);

  console.log("\n========== STUDENTS BY CLASS AND YEAR ==========");
  const result = await pool.query(`
    SELECT
      ay.name AS academic_year,
      c.name AS class,
      COUNT(DISTINCT e.student_id)::int AS student_count
    FROM enrollments e
    JOIN academic_years ay ON ay.id = e.academic_year_id
    JOIN classes c ON c.id = e.class_id
    WHERE e.status = 'active'
    GROUP BY ay.name, c.name, c.sort_order
    ORDER BY ay.name, c.sort_order
  `);
  console.table(result.rows);
} catch (error) {
  console.error(error.message);
} finally {
  await pool.end();
}
