import { betterAuth } from 'better-auth'
import { dash } from '@better-auth/infra'
import { Pool } from 'pg'

// DATABASE_URL is provisioned separately (Vercel Storage → Postgres). Until
// it's set, sign-up/sign-in will fail at query time, but the auth handler
// itself still boots — which is all the dash plugin's ownership check needs.
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'https://sev0.kabeers.network',
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [dash()],
})
