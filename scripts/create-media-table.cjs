const { Pool } = require("pg");
const fs = require("fs");

// Read database URL from .env file
const envContent = fs.readFileSync(".env", "utf8");
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
const DATABASE_URL = dbUrlMatch ? dbUrlMatch[1] : null;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in .env file");
  process.exit(1);
}

// Parse the connection string manually since it has special characters
// Format: postgresql://user:password@host:port/database
const match = DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!match) {
  console.error("Could not parse DATABASE_URL");
  process.exit(1);
}

const [, user, password, host, port, database] = match;

const pool = new Pool({
  host: host,
  port: parseInt(port),
  database: database,
  user: user,
  password: password,
  ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  taken_at TIMESTAMP,
  alt TEXT DEFAULT ''
);
`;

pool.query(sql)
  .then(() => {
    console.log("Media table created successfully!");
    pool.end();
  })
  .catch(e => {
    console.error("Error:", e.message);
    pool.end();
    process.exit(1);
  });
