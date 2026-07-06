function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

const PALETTE = ['#FFC60B', '#FF5470', '#1F9D55', '#3B82F6', '#A855F7', '#F97316']

function colorFor(seed: number) {
  return PALETTE[seed % PALETTE.length]
}

export function Avatar({
  name,
  id,
  online,
  size = 36,
}: {
  name: string
  id: number
  online?: boolean
  size?: number
}) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center border-2 border-ink font-display font-bold text-ink"
      style={{ width: size, height: size, background: colorFor(id), fontSize: size * 0.38 }}
    >
      {initials(name)}
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 border-2 border-paper ${
            online ? 'bg-online' : 'bg-ink-soft'
          }`}
        />
      )}
    </span>
  )
}
