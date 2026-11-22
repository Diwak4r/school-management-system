import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const { Client } = require("pg");

loadEnvConfig(process.cwd());

const client = new Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
});

await client.connect();

const result = await client.query(
  "SELECT id, name, level, sort_order FROM classes ORDER BY sort_order"
);

console.table(result.rows);
console.log("Total classes:", result.rowCount);

await client.end();
