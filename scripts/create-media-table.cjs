const { Pool } = require("pg");

// Use the same connection details as the systemd service
const pool = new Pool({
  host: "ls-6a2c055e68703232d005b2538032dfdff31b2682.cfjrgltnykyd.us-west-2.rds.amazonaws.com",
  port: 5432,
  database: "pennquinn",
  user: "dbmasteruser",
  password: "PennQuinn2024db",
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
