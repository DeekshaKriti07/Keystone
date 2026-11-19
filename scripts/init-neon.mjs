import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  if (process.env.VERCEL_ENV === 'production') throw new Error('Production DATABASE_URL is missing.');
  console.log('Skipping Neon schema setup because DATABASE_URL is unavailable.');
} else {
  const source = readFileSync(new URL('./neon-schema.sql', import.meta.url), 'utf8');
  const statements = source.split(';').map(statement => statement.trim()).filter(Boolean);
  const sql = neon(url);
  await sql.transaction([
    sql.query('SELECT pg_advisory_xact_lock(6141099217342810381)'),
    ...statements.map(statement => sql.query(statement)),
  ]);
  console.log('Keystone database schema is ready.');
}
