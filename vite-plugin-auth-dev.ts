// Bridges Vite's dev server to the Better Auth handler that lives at
// api/auth/all.ts in production (rewritten by vercel.json). Without this,
// /api/auth/sign-in/email returns 404 on localhost because Vite has no
// API handler at that path.

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined
}

function nodeHeadersToWebHeaders(headers: IncomingMessage['headers']): Headers {
  const out = new Headers()
  for (const [k, v] of Object.entries(headers)) {
    if (v == null) continue
    if (Array.isArray(v)) v.forEach((vv) => out.append(k, vv))
    else out.set(k, String(v))
  }
  return out
}

async function writeWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  res.statusMessage = response.statusText
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') res.appendHeader(key, value)
    else res.setHeader(key, value)
  })
  if (response.body) {
    const buf = Buffer.from(await response.arrayBuffer())
    res.end(buf)
  } else {
    res.end()
  }
}

export function authDevPlugin(): Plugin {
  return {
    name: 'auth-dev',
    configureServer(server) {
      server.middlewares.use('/api/auth', async (req, res, next) => {
        if (!req.url) return next()
        if (!process.env.DATABASE_URL) {
          res.statusCode = 503
          res.setHeader('content-type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'DATABASE_URL not set. Auth needs Postgres locally — set it in .env or .env.local.',
            }),
          )
          return
        }
        try {
          const { auth } = await import('./api/_lib/auth.js')
          const url = `http://localhost:${server.config.server.port ?? 5173}${req.url}`
          const body = await readBody(req)
          const request = new Request(url, {
            method: req.method,
            headers: nodeHeadersToWebHeaders(req.headers),
            body: body ?? null,
            duplex: 'half',
          })
          const response = await auth.handler(request)
          await writeWebResponse(res, response)
        } catch (err) {
          next(err)
        }
      })
    },
  }
}
