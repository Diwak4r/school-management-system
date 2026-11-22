import { createRequire } from "node:module";
import { Pool } from "pg";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) throw new Error("Database URL not found.");

const name = process.env.ADMIN_NAME;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!name || !email || !password || password.length < 8) {
  throw new Error("Name, email and password (minimum 8 characters) are required.");
}

const salt = crypto.randomBytes(12).toString("hex");
const passwordHash =
  `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;

const pool = new Pool({ connectionString });

async function main() {
  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (existing.rowCount) {
      throw new Error("This email already exists. No account changed.");
    }

    const admins = await pool.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (admins.rowCount) {
      throw new Error("An administrator already exists. No account created.");
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, name, email, role`,
      [name, email, passwordHash]
    );

    console.log("Administrator created successfully:");
    console.table(result.rows);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Setup failed:", error.message);
  process.exitCode = 1;
});
