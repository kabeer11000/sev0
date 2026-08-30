import { readFileSync } from 'node:fs'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const sql = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')

try {
  await pool.query(sql)
  console.log('schema applied')
} finally {
  await pool.end()
}
