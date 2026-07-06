import { type ButtonHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2 border-2 border-ink font-display font-medium transition-transform duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none',
          size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs',
          variant === 'primary' &&
            'bg-accent text-accent-ink shadow-hard-sm hover:-translate-y-[1px] hover:shadow-hard',
          variant === 'ghost' &&
            'bg-paper text-ink shadow-hard-sm hover:-translate-y-[1px] hover:shadow-hard',
          variant === 'danger' &&
            'bg-flag text-paper shadow-hard-sm hover:-translate-y-[1px] hover:shadow-hard',
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
