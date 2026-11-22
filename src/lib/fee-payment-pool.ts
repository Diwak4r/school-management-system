import { Pool } from "pg";

const globalForFeePool = globalThis as unknown as {
  feePaymentPool?: Pool;
};

const pool =
  globalForFeePool.feePaymentPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForFeePool.feePaymentPool = pool;
}

export { pool as feePaymentPool };