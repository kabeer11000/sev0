import { navigate } from '../router'

export function NotFoundPage({ caseId }: { caseId: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center" style={{ background: 'var(--bg)' }}>
      <div className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--fg-faint)' }}>
        404
      </div>
      <h1 className="text-[17px] font-semibold">No incident found for &ldquo;{caseId}&rdquo;</h1>
      <button
        onClick={() => navigate('/')}
        className="mt-2 rounded px-3 py-1.5 font-mono text-[12px]"
        style={{ border: '1px solid var(--border-strong)', color: 'var(--fg)', background: 'var(--surface)' }}
      >
        ← back to open incidents
      </button>
    </div>
  )
}
