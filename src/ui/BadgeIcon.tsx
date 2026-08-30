import type { BadgeId } from '../badges'

interface Props {
  id: BadgeId
  size?: number
}

const COMMON = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function BadgeIcon({ id, size = 24 }: Props) {
  switch (id) {
    case 'first-blood':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...COMMON}>
          <path d="M12 3 C 9 7 8 10 8 13 a4 4 0 0 0 8 0 C 16 10 15 7 12 3 Z" />
        </svg>
      )
    case 'hat-trick':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...COMMON}>
          <path d="M5 18 L9 9 L13 18" />
          <path d="M11 18 L15 9 L19 18" />
          <path d="M4 18 L20 18" />
        </svg>
      )
    case 'on-fire':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...COMMON}>
          <path d="M12 3 C 9 7 7 9 7 13 a5 5 0 0 0 10 0 C 17 9 15 7 12 3 Z" />
          <path d="M10 14 c 0 2 1 3 2 3 s 2 -1 2 -3" />
        </svg>
      )
    case 'speed-demon':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...COMMON}>
          <circle cx="12" cy="13" r="7" />
          <path d="M12 13 L 15 9" />
          <path d="M10 3 L 14 3" />
          <path d="M12 3 L 12 6" />
        </svg>
      )
    case 'no-peeking':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...COMMON}>
          <path d="M3 12 C 5 7 8 5 12 5 C 16 5 19 7 21 12 C 19 17 16 19 12 19 C 8 19 5 17 3 12 Z" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M4 4 L 20 20" />
        </svg>
      )
    case 'ghost-protocol':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...COMMON}>
          <path d="M6 11 a6 6 0 0 1 12 0 V 19 L 16 17 L 12 19 L 8 17 L 6 19 Z" />
          <circle cx="10" cy="11" r="0.6" fill="currentColor" />
          <circle cx="14" cy="11" r="0.6" fill="currentColor" />
        </svg>
      )
    case 'iron-will':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...COMMON}>
          <path d="M5 7 L 19 7 L 17 11 L 19 19 L 5 19 L 7 11 Z" />
          <path d="M5 7 L 12 3 L 19 7" />
        </svg>
      )
    case 'centurion':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...COMMON}>
          <path d="M4 13 C 4 8 8 5 12 5 C 16 5 20 8 20 13" />
          <path d="M6 13 L 4 11" />
          <path d="M6 14 L 3 14" />
          <path d="M6 16 L 3 18" />
          <path d="M18 13 L 20 11" />
          <path d="M18 14 L 21 14" />
          <path d="M18 16 L 21 18" />
          <circle cx="12" cy="11" r="1.5" />
        </svg>
      )
  }
}