import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table for express-session with PostgreSQL store
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Simple user type for admin authentication
// Note: We use a simple password-based auth, so no users table is needed
// The admin user is configured via ADMIN_PASSWORD environment variable
export type User = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
};

export type UpsertUser = User;
