import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
if (!email) {
  console.error("SUPERADMIN_EMAIL is not configured. No platform owner is granted access.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    "select id, name, email, role from users where id = 1 limit 1",
  );
  const owner = rows[0];
  const ok =
    Boolean(owner) &&
    owner.role === "admin" &&
    owner.email?.trim().toLowerCase() === email;

  if (!ok) {
    console.error("Platform owner check failed.");
    console.error(`  expected id: 1, role: admin, email: ${email}`);
    console.error(
      owner
        ? `  found id: ${owner.id}, role: ${owner.role}`
        : "  found: no user with id 1",
    );
    process.exitCode = 1;
  } else {
    console.log(`Platform owner verified: ${owner.name} (id ${owner.id}).`);
    console.log("No password or account data was changed.");
  }
} finally {
  await client.end();
}
