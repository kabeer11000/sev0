import type { VercelRequest, VercelResponse } from '@vercel/node'
import { pool } from './_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' })
    return
  }

  const { rows } = await pool.query(`
    select
      u.name as name,
      count(*)::int as "resolvedCount",
      avg(ip."resolutionMs") filter (where ip."resolutionMs" is not null) as "avgResolutionMs",
      coalesce(sum(ip."hintsUsed"), 0)::int as "totalHintsUsed"
    from "incident_progress" ip
    join "user" u on u.id = ip."userId"
    group by u.id, u.name
    order by "resolvedCount" desc, "avgResolutionMs" asc nulls last
    limit 50
  `)

  res.setHeader('cache-control', 's-maxage=30, stale-while-revalidate')
  res.status(200).json(
    rows.map((r) => ({
      name: r.name as string,
      resolvedCount: r.resolvedCount as number,
      avgResolutionMs: r.avgResolutionMs == null ? null : Math.round(Number(r.avgResolutionMs)),
      totalHintsUsed: r.totalHintsUsed as number,
    })),
  )
}
