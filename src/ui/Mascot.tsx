import { useEffect, useMemo, useRef, useState } from 'react'

export type MascotState =
  | 'happy'
  | 'alert'
  | 'worried'
  | 'panicked'
  | 'excited'
  | 'bored'
  | 'sleepy'
  | 'curious'
  | 'disappointed'
  | 'sad'
  | 'scared'

interface Props {
  mood: MascotState
}

const BODY_COLORS: Record<MascotState, string> = {
  happy: '#d4a574',
  alert: '#e26d44',
  worried: '#c98715',
  panicked: '#c43d34',
  excited: '#e8b647',
  bored: '#b8a989',
  sleepy: '#9b8eb8',
  curious: '#7dacb8',
  disappointed: '#a89684',
  sad: '#7a8fa3',
  scared: '#b88f9c',
}

/**
 * Round on-call critter whose face reacts to editor activity + time pressure.
 *
 * Timer-driven moods:
 *   panicked  (over budget) — X eyes, zigzag mouth, sweating, shake
 *   worried   (<25%)        — worried brows, wavy mouth, sweat
 *   alert     (25-50%)      — wide eyes, small "o" mouth
 *
 * Activity-driven moods:
 *   excited    (editing)         — sparkle eyes, big open smile
 *   bored      (idle 30s)        — half-lidded eyes, flat mouth, "..."
 *   sleepy     (idle 2min)       — closed eyes, ZZZ floating up
 *   curious    (just revealed hint) — one eye bigger, "o" mouth
 *   disappointed (just revealed solution) — frown, downcast eyes
 *   sad        (recent failed submit) — frown, single teardrop
 *   scared     (grading)         — wide eyes, small mouth
 */
export function Mascot({ mood }: Props) {
  const bodyColor = useMemo(() => BODY_COLORS[mood], [mood])
  const svgRef = useRef<SVGSVGElement>(null)
  const [lookAt, setLookAt] = useState({ x: 0, y: 0 })

  // pupils track the cursor — only the moods with round pupils (happy, alert,
  // scared, curious) actually move; the others (X eyes, stars, arcs) ignore it
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = svgRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.hypot(dx, dy) || 1
      const reach = 140 // px before pupils sit at max
      const clamp = Math.min(dist, reach) / reach
      setLookAt({ x: (dx / dist) * clamp, y: (dy / dist) * clamp })
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  // small px offset in viewBox coords (the mascot SVG is 28x28, but rendered at
  // 26x26 — keep the offset well under the eye radius so the pupil stays inside)
  const ox = lookAt.x * 0.9
  const oy = lookAt.y * 0.9

  const wrapperClass =
    mood === 'panicked' ? 'mascot-bob mascot-shake' :
    mood === 'scared' ? 'mascot-bob mascot-shake' :
    mood === 'excited' ? 'mascot-bob' :
                          'mascot-bob'

  const title =
    mood === 'panicked' ? 'Over the time budget — the critter is panicking' :
    mood === 'sad' ? 'That submit didn\'t pass — keep at it' :
    mood === 'disappointed' ? 'Solution revealed — the badge economy notices' :
    mood === 'curious' ? 'Hint revealed — check the breakdown' :
    mood === 'excited' ? 'You\'re editing — keep going' :
    mood === 'bored' ? 'Idle for 30s — what\'s the next move?' :
    mood === 'sleepy' ? 'Idle for 2min — the on-call critter is dozing off' :
    mood === 'scared' ? 'Grading your fix against hidden seeds…' :
    mood === 'worried' ? 'Less than 25% of the time budget left' :
    mood === 'alert' ? 'Half the time budget gone' :
                        'Time remaining in the budget'

  return (
    <div className={wrapperClass} title={title}>
      <div className="mascot-breathe" style={{ width: 26, height: 26, position: 'relative' }}>
        <svg ref={svgRef} viewBox="0 0 28 28" width="26" height="26" aria-hidden>
          {/* body */}
          <circle cx="14" cy="14" r="11" fill={bodyColor} stroke="rgba(0,0,0,0.10)" strokeWidth="0.6" />

          {/* cheek blush for happy/excited */}
          {(mood === 'happy' || mood === 'excited') && (
            <>
              <circle cx="7.5" cy="16.5" r="1.4" fill="#f5a89a" opacity={mood === 'excited' ? '0.75' : '0.55'} />
              <circle cx="20.5" cy="16.5" r="1.4" fill="#f5a89a" opacity={mood === 'excited' ? '0.75' : '0.55'} />
            </>
          )}

          {/* eyes */}
          <g className="mascot-eyes">
            {mood === 'panicked' ? (
              <>
                <path d="M8.5 12.5 L11.5 15" stroke="#2b241c" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M11.5 12.5 L8.5 15" stroke="#2b241c" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M16.5 12.5 L19.5 15" stroke="#2b241c" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M19.5 12.5 L16.5 15" stroke="#2b241c" strokeWidth="1.6" strokeLinecap="round" />
              </>
            ) : mood === 'alert' || mood === 'scared' ? (
              <g transform={`translate(${ox}, ${oy})`}>
                <circle cx="10" cy="13" r="2" fill="#2b241c" />
                <circle cx="18" cy="13" r="2" fill="#2b241c" />
                <circle cx="10.7" cy="12.3" r="0.7" fill="white" />
                <circle cx="18.7" cy="12.3" r="0.7" fill="white" />
              </g>
            ) : mood === 'excited' ? (
              <>
                <path d="M8.5 11 L11.5 11 L10 14.5 Z" fill="#2b241c" />
                <path d="M19.5 11 L16.5 11 L18 14.5 Z" fill="#2b241c" />
                <circle cx="9.6" cy="11.8" r="0.4" fill="white" />
                <circle cx="18.4" cy="11.8" r="0.4" fill="white" />
              </>
            ) : mood === 'bored' ? (
              <>
                <path d="M8 13 Q10 14.5 12 13" stroke="#2b241c" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                <path d="M16 13 Q18 14.5 20 13" stroke="#2b241c" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              </>
            ) : mood === 'sleepy' ? (
              <>
                <path d="M8.5 13 Q10 14.5 11.5 13" stroke="#2b241c" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                <path d="M16.5 13 Q18 14.5 19.5 13" stroke="#2b241c" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              </>
            ) : mood === 'curious' ? (
              <g transform={`translate(${ox}, ${oy})`}>
                <circle cx="10" cy="13" r="1.4" fill="#2b241c" />
                <circle cx="18" cy="13" r="2.2" fill="#2b241c" />
                <circle cx="18.6" cy="12.2" r="0.7" fill="white" />
              </g>
            ) : mood === 'disappointed' || mood === 'sad' ? (
              <>
                <path d="M9 14.5 Q10 14 11 14.5" stroke="#2b241c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                <path d="M17 14.5 Q18 14 19 14.5" stroke="#2b241c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <g transform={`translate(${ox}, ${oy})`}>
                <ellipse cx="10" cy="13" rx="1.3" ry="1.6" fill="#2b241c" />
                <ellipse cx="18" cy="13" rx="1.3" ry="1.6" fill="#2b241c" />
                <circle cx="10.4" cy="12.4" r="0.4" fill="white" />
                <circle cx="18.4" cy="12.4" r="0.4" fill="white" />
              </g>
            )}
          </g>

          {/* brows — only for some moods */}
          {mood === 'worried' && (
            <>
              <path d="M7.5 10.5 L10.5 11.5" stroke="#2b241c" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M20.5 10.5 L17.5 11.5" stroke="#2b241c" strokeWidth="1.2" strokeLinecap="round" />
            </>
          )}
          {mood === 'scared' && (
            <>
              <path d="M7.5 11 L10.5 10" stroke="#2b241c" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M20.5 11 L17.5 10" stroke="#2b241c" strokeWidth="1.2" strokeLinecap="round" />
            </>
          )}
          {mood === 'curious' && (
            <path d="M16.5 9.5 L19.5 9" stroke="#2b241c" strokeWidth="1.2" strokeLinecap="round" />
          )}

          {/* mouth */}
          {mood === 'panicked' ? (
            <path d="M9 18.5 L11 19.5 L13 18.5 L15 19.5 L17 18.5 L19 19.5" stroke="#2b241c" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : mood === 'worried' ? (
            <path d="M10 18 Q11.5 17 13 18 T16 18 T19 18" stroke="#2b241c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          ) : mood === 'alert' ? (
            <ellipse cx="14" cy="18" rx="1.6" ry="1.7" fill="#2b241c" />
          ) : mood === 'excited' ? (
            <path d="M9 16.5 Q14 21 19 16.5 Q14 19 9 16.5 Z" fill="#2b241c" />
          ) : mood === 'bored' ? (
            <path d="M10.5 18 L17.5 18" stroke="#2b241c" strokeWidth="1.5" strokeLinecap="round" />
          ) : mood === 'sleepy' ? (
            <ellipse cx="14" cy="19" rx="2" ry="1.2" fill="#2b241c" opacity="0.7" />
          ) : mood === 'curious' ? (
            <ellipse cx="14" cy="18" rx="1.3" ry="1.4" fill="#2b241c" />
          ) : mood === 'disappointed' ? (
            <path d="M10 19.5 Q14 17 18 19.5" stroke="#2b241c" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          ) : mood === 'sad' ? (
            <path d="M10 19.5 Q14 16.5 18 19.5" stroke="#2b241c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          ) : mood === 'scared' ? (
            <ellipse cx="14" cy="18.5" rx="1.2" ry="1.5" fill="#2b241c" />
          ) : (
            <path d="M10 17 Q14 19.8 18 17" stroke="#2b241c" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          )}

          {/* sweat drops for stressed moods */}
          {mood === 'worried' && (
            <ellipse cx="22" cy="6" rx="1" ry="1.4" fill="#4ab8d9" opacity="0.85" className="mascot-sweat" />
          )}
          {mood === 'panicked' && (
            <>
              <ellipse cx="22" cy="4.5" rx="1" ry="1.5" fill="#4ab8d9" opacity="0.9" className="mascot-sweat" />
              <ellipse cx="5" cy="8" rx="0.8" ry="1.2" fill="#4ab8d9" opacity="0.85" className="mascot-sweat" style={{ animationDelay: '0.6s' }} />
            </>
          )}
          {mood === 'scared' && (
            <ellipse cx="22" cy="6" rx="0.9" ry="1.3" fill="#4ab8d9" opacity="0.85" className="mascot-sweat" />
          )}

          {/* teardrop for sad */}
          {mood === 'sad' && (
            <path d="M7 17 Q6.3 18.5 7 19 Q7.7 18.5 7 17 Z" fill="#4ab8d9" opacity="0.85" />
          )}

          {/* "..." dots for bored */}
          {mood === 'bored' && (
            <g opacity="0.7">
              <circle cx="11" cy="22" r="0.6" fill="#2b241c" />
              <circle cx="14" cy="22" r="0.6" fill="#2b241c" />
              <circle cx="17" cy="22" r="0.6" fill="#2b241c" />
            </g>
          )}
        </svg>

        {/* ZZZ for sleepy */}
        {mood === 'sleepy' && (
          <svg
            width="28"
            height="20"
            viewBox="0 0 28 20"
            style={{ position: 'absolute', left: 20, top: -6, pointerEvents: 'none' }}
            aria-hidden
          >
            <text x="2" y="8" fontSize="6" fontWeight="700" fill="#6b6053" className="mascot-zzz">z</text>
            <text x="10" y="4" fontSize="8" fontWeight="700" fill="#6b6053" className="mascot-zzz" style={{ animationDelay: '0.6s' }}>Z</text>
            <text x="20" y="1" fontSize="10" fontWeight="700" fill="#6b6053" className="mascot-zzz" style={{ animationDelay: '1.2s' }}>Z</text>
          </svg>
        )}
      </div>
    </div>
  )
}