import { type InputHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        'w-full border-2 border-ink bg-paper px-3 py-2 text-sm font-body placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
