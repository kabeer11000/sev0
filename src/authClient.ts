import { createAuthClient } from 'better-auth/react'

// same-origin — the API and the app are served from the same Vercel deployment
export const authClient = createAuthClient({})

export const { useSession, signIn, signUp, signOut } = authClient
