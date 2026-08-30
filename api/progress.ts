import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from './_lib/auth'
import { pool } from './_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session) {
    res.status(401).json({ error: 'not signed in' })
    return
  }

  if (req.method === 'GET') {
    const { rows } = await pool.query(
      'select "caseId", "solvedAt", "resolutionMs", "hintsUsed", "solutionRevealed" from "incident_progress" where "userId" = $1',
      [session.user.id],
    )
    res.status(200).json(rows)
    return
  }

  if (req.method === 'POST') {
    const { caseId, resolutionMs, hintsUsed, solutionRevealed } = req.body ?? {}
    if (typeof caseId !== 'string' || !caseId) {
      res.status(400).json({ error: 'caseId is required' })
      return
    }
    await pool.query(
      `insert into "incident_progress" ("userId", "caseId", "resolutionMs", "hintsUsed", "solutionRevealed")
       values ($1, $2, $3, $4, $5)
       on conflict ("userId", "caseId") do nothing`,
      [session.user.id, caseId, resolutionMs ?? null, hintsUsed ?? 0, !!solutionRevealed],
    )
    res.status(200).json({ ok: true })
    return
  }

  res.status(405).json({ error: 'method not allowed' })
}
