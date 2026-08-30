import { useEffect, useState } from 'react'

interface Props {
  /** trigger key — when this changes, a new burst spawns */
  trigger: number
  /** amount to show on the floating number badge; <=0 hides badge */
  amount: number
}

interface Coin {
  id: number
  startX: number
  startY: number
  targetX: number
  targetY: number
  delay: number
  duration: number
  size: number
}

function CoinShape({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <radialGradient id={`coin-grad-${size}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffe1a8" />
          <stop offset="55%" stopColor="#f3a14e" />
          <stop offset="100%" stopColor="#c4552f" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#coin-grad-${size})`} stroke="#7c3a16" strokeWidth="1" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="#7c3a16"
        fontFamily="ui-monospace, monospace"
      >
        XP
      </text>
    </svg>
  )
}

export function XpCoinFloater({ trigger, amount }: Props) {
  const [coins, setCoins] = useState<Coin[]>([])

  useEffect(() => {
    if (trigger === 0 || amount <= 0) return

    const target = document.getElementById('xp-target')
    if (!target) return
    const tr = target.getBoundingClientRect()
    const tx = tr.left + tr.width / 2
    const ty = tr.top + tr.height / 2

    const v = document.getElementById('verdict-panel-root')
    const sr = v?.getBoundingClientRect()
    const baseX = sr ? sr.left + sr.width * 0.55 : window.innerWidth * 0.7
    const baseY = sr ? sr.top + sr.height * 0.45 : window.innerHeight * 0.5

    const count = 7
    const next: Coin[] = []
    for (let i = 0; i < count; i++) {
      next.push({
        id: Date.now() + i,
        startX: baseX + (Math.random() - 0.5) * 80,
        startY: baseY + (Math.random() - 0.5) * 60,
        targetX: tx + (Math.random() - 0.5) * 16,
        targetY: ty + (Math.random() - 0.5) * 12,
        delay: i * 60,
        duration: 950 + Math.random() * 250,
        size: 22 + Math.random() * 8,
      })
    }
    setCoins(next)

    const clearTimer = window.setTimeout(() => setCoins([]), 1400)
    return () => window.clearTimeout(clearTimer)
  }, [trigger, amount])

  if (coins.length === 0) return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[55] overflow-hidden">
      {coins.map((c) => (
        <FlyingCoin key={c.id} coin={c} />
      ))}
      <span
        key={`badge-${trigger}`}
        className="absolute font-mono font-extrabold"
        style={{
          left: '50%',
          top: '38%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(28px, 4vw, 44px)',
          color: '#fff',
          textShadow: '0 2px 8px rgba(196, 85, 47, 0.7), 0 0 24px rgba(238, 90, 54, 0.55)',
          animation: 'xp-fly-num 1100ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
          pointerEvents: 'none',
        }}
      >
        +{amount} XP
      </span>
    </div>
  )
}

function FlyingCoin({ coin }: { coin: Coin }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: coin.startX,
    top: coin.startY,
    transform: 'translate(-50%, -50%)',
  }

  useEffect(() => {
    const dx = coin.targetX - coin.startX
    const dy = coin.targetY - coin.startY
    const el = document.getElementById(`coin-${coin.id}`)
    if (!el) return

    el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 0, offset: 0 },
        { transform: 'translate(-50%, -50%) scale(1.1) rotate(120deg)', opacity: 1, offset: 0.15 },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6) rotate(540deg)`,
          opacity: 0,
          offset: 1,
        },
      ],
      {
        duration: coin.duration,
        delay: coin.delay,
        easing: 'cubic-bezier(0.34, 1.20, 0.64, 1)',
        fill: 'forwards',
      },
    )
  }, [coin])

  return (
    <span id={`coin-${coin.id}`} style={style}>
      <CoinShape size={coin.size} />
    </span>
  )
}
