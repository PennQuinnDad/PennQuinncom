import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.error("[DB] DATABASE_URL environment variable is not set!");
} else {
  console.log("[DB] Database URL configured");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err);
});

pool.on('connect', () => {
  console.log('[DB] Connected to database');
});

export const db = drizzle(pool, { schema });
