require('dotenv').config();
const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    const dir = path.resolve(__dirname, '../src/database/migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const done = await pool.query('SELECT 1 FROM schema_migrations WHERE name=$1', [file]);
      if (done.rowCount) { process.stdout.write(`SKIP ${file}\n`); continue; }
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [file]);
        await client.query('COMMIT');
        process.stdout.write(`APPLIED ${file}\n`);
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    }
    process.stdout.write('Database migrations complete.\n');
  } finally { await pool.end(); }
}
main().catch((error) => { console.error('Migration failed:', error.message); process.exitCode = 1; });
