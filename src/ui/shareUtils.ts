import type { RunResult, SubmitResult } from '../runner'
import type { IotRunResult, IotSubmitResult } from '../iotRunner'

export function formatResultSummary(
  caseId: string,
  lastRun: RunResult | IotRunResult | undefined,
  submitResult: SubmitResult | IotSubmitResult | undefined,
): string {
  const lines = [`Sev0 — ${caseId}`]

  if (submitResult) {
    const keyTotals = new Map<string, { title: string; pass: number }>()
    for (const run of submitResult.runs) {
      for (const r of run.oracle.results) {
        const entry = keyTotals.get(r.key) ?? { title: r.title, pass: 0 }
        if (r.passed) entry.pass++
        keyTotals.set(r.key, entry)
      }
    }
    const n = submitResult.runs.length
    for (const { title, pass } of keyTotals.values()) {
      lines.push(`${pass === n ? 'PASS' : 'FAIL'}  ${title}  (${pass}/${n} seeds)`)
    }
    lines.push('')
    lines.push(`${submitResult.passed ? 'RESOLVED' : 'NOT RESOLVED'} — ${Math.round(submitResult.passRate * 100)}% pass rate`)
    return lines.join('\n')
  }

  if (lastRun && !lastRun.error) {
    lines.push('(practice seed only — not yet submitted)')
    for (const r of lastRun.oracle.results) {
      lines.push(`${r.passed ? 'PASS' : 'FAIL'}  ${r.title}`)
    }
    return lines.join('\n')
  }

  return lines.concat('no run yet').join('\n')
}

// URL-safe base64, robust to any unicode in the code (comments, etc).
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64: string): string {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

interface SolutionPayload {
  v: 1
  code: Record<string, string>
}

export function buildShareUrl(code: Record<string, string>): string {
  const payload: SolutionPayload = { v: 1, code }
  const encoded = toBase64Url(JSON.stringify(payload))
  return `${location.origin}${location.pathname}#s=${encoded}`
}

export function readSharedSolutionFromHash(): Record<string, string> | null {
  if (typeof location === 'undefined') return null
  const hash = location.hash
  if (!hash.startsWith('#s=')) return null
  try {
    const payload = JSON.parse(fromBase64Url(hash.slice(3))) as SolutionPayload
    if (payload?.v === 1 && payload.code && typeof payload.code === 'object') return payload.code
    return null
  } catch {
    return null
  }
}

export function clearShareHash() {
  history.replaceState(null, '', location.pathname + location.search)
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
