interface Props {
  size?: number
  className?: string
}

export function SparkleIcon({ size = 14, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M8 0 L 9.2 5.4 L 14.5 6.8 L 9.2 8.2 L 8 13.6 L 6.8 8.2 L 1.5 6.8 L 6.8 5.4 Z" />
      <circle cx="13" cy="2.5" r="1" />
      <circle cx="2.5" cy="13" r="1" />
    </svg>
  )
}
