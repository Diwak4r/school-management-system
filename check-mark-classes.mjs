import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const { Pool } = require("pg");

loadEnvConfig(process.cwd());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

try {
  const classes = await pool.query(
    "SELECT id, name FROM classes ORDER BY sort_order, id"
  );

  const exams = await pool.query(
    "SELECT id, name FROM examinations ORDER BY id"
  );

  console.log("\n========== ALL CLASSES ==========");
  console.table(classes.rows);

  console.log("\n========== EXAMINATIONS ==========");
  console.table(exams.rows);

  console.log("\n========== CLASSES WITH EXAM SUBJECTS ==========");
  const subjects = await pool.query(`
    SELECT e.id AS exam_id, e.name AS exam_name,
           c.id AS class_id, c.name AS class_name,
           COUNT(es.id)::int AS subject_count
    FROM examinations e
    LEFT JOIN exam_subjects es ON es.exam_id = e.id
    LEFT JOIN classes c ON c.id = es.class_id
    GROUP BY e.id, e.name, c.id, c.name
    ORDER BY e.id, c.id
  `);
  console.table(subjects.rows);
} catch (error) {
  console.error("Database check failed:", error.message);
} finally {
  await pool.end();
}
