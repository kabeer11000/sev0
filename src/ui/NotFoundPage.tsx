import { navigate } from '../router'

function GhostIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ghost-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-dim)" />
          <stop offset="100%" stopColor="var(--bg-elevated)" />
        </linearGradient>
      </defs>
      <path
        d="M28 6 C 16 6 10 14 10 24 L 10 42 L 14 39 L 18 42 L 22 39 L 26 42 L 30 39 L 34 42 L 38 39 L 42 42 L 46 39 L 46 24 C 46 14 40 6 28 6 Z"
        fill="url(#ghost-grad)"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="22" r="2.5" fill="var(--fg-muted)" />
      <circle cx="34" cy="22" r="2.5" fill="var(--fg-muted)" />
      <ellipse cx="28" cy="30" rx="2.5" ry="3" fill="var(--accent-strong)" />
    </svg>
  )
}

export function NotFoundPage({ caseId }: { caseId: string }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center"
      style={{ background: 'var(--bg)' }}
    >
      <div className="float-soft">
        <GhostIcon />
      </div>
      <div
        className="rounded-full px-3 py-1 font-mono text-[10.5px] font-bold"
        style={{ background: 'var(--accent-dim)', color: 'var(--accent-strong)', letterSpacing: '0.10em' }}
      >
        404 · INCIDENT NOT FOUND
      </div>
      <h1 className="text-[20px] font-semibold" style={{ letterSpacing: '-0.01em' }}>
        Couldn&rsquo;t find an incident called &ldquo;{caseId}&rdquo;.
      </h1>
      <p className="max-w-[40ch] text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
        Maybe the case id changed — the queue keeps an up-to-date list of everything on fire.
      </p>
      <button
        onClick={() => navigate('/')}
        className="mt-2 rounded-full px-5 py-2 text-[13px] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-md"
        style={{
          background: 'linear-gradient(180deg, #f37c5a 0%, var(--accent) 60%, var(--accent-strong) 100%)',
          boxShadow: '0 4px 12px rgba(238, 90, 54, 0.28)',
        }}
      >
        ← back to the queue
      </button>
    </div>
  )
}