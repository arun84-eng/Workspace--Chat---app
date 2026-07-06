import type { ReactNode } from 'react'

const ROTATIONS = ['-2deg', '1.5deg', '-1deg', '2deg', '-1.5deg']

export function StickyNote({
  children,
  index = 0,
}: {
  children: ReactNode
  index?: number
}) {
  return (
    <div
      className="border-2 border-ink bg-accent p-3 font-body text-sm shadow-hard"
      style={{ transform: `rotate(${ROTATIONS[index % ROTATIONS.length]})` }}
    >
      {children}
    </div>
  )
}
