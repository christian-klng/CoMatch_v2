import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL is not set — queries will fail.");
}

// Single shared pool for the process.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
