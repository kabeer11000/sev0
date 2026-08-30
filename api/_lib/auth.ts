import { betterAuth } from 'better-auth'
import { dash } from '@better-auth/infra'
import { pool } from './db.js'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'https://sev0.kabeers.network',
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [dash()],
})
