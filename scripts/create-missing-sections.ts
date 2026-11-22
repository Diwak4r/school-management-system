import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (let grade = 6; grade <= 10; grade++) {
      const classResult = await client.query(
        "SELECT id FROM classes WHERE name = $1",
        [`Grade ${grade}`]
      );

      if (classResult.rows.length === 0) {
        throw new Error(`Grade ${grade} not found.`);
      }

      const classId = classResult.rows[0].id;
      const sectionNames = grade >= 9 ? ["A", "B"] : ["A"];

      for (const sectionName of sectionNames) {
        await client.query(
          `INSERT INTO sections (class_id, name)
           SELECT $1::integer, $2::varchar
           WHERE NOT EXISTS (
             SELECT 1
             FROM sections
             WHERE class_id = $1::integer
               AND name::text = $2::text
           )`,
          [classId, sectionName]
        );
      }
    }

    await client.query("COMMIT");

    const result = await client.query(`
      SELECT c.name AS class, s.id AS section_id, s.name AS section
      FROM classes c
      JOIN sections s ON s.class_id = c.id
      WHERE c.name IN (
        'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'
      )
      ORDER BY c.id, s.id
    `);

    console.log("\nSections successfully created or verified:");
    console.table(result.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("Section creation failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
