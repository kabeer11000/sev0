import { Pool } from 'pg'

// Shared across the auth handler and the app's own endpoints — one pool per
// serverless instance, reused across invocations while it's warm.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
