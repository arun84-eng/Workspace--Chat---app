import type { ReactNode } from 'react'
import clsx from 'clsx'

export function Badge({
  children,
  tone = 'accent',
}: {
  children: ReactNode
  tone?: 'accent' | 'flag' | 'ink'
}) {
  return (
    <span
      className={clsx(
        'inline-flex min-w-[1.25rem] items-center justify-center border-2 border-ink px-1.5 py-0.5 font-mono text-[11px] font-medium leading-none',
        tone === 'accent' && 'bg-accent text-ink',
        tone === 'flag' && 'bg-flag text-paper',
        tone === 'ink' && 'bg-ink text-paper'
      )}
    >
      {children}
    </span>
  )
}
