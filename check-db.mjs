import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const { Client } = require("pg");

loadEnvConfig(process.cwd());

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();

  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('users', 'sessions')
  `);

  console.log("Database tables:", result.rows);

} catch (error) {
  console.error("DATABASE ERROR:", error.message);
} finally {
  await client.end();
}
