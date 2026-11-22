import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const { Client } = require("pg");

loadEnvConfig(process.cwd());

const client = new Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
});

await client.connect();

const result = await client.query(
  "SELECT id, name, email, role FROM users ORDER BY id"
);

console.table(result.rows);
await client.end();
