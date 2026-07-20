import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Input = forwardRef(function Input(
  { label, error, hint, className, as = 'input', ...props },
  ref,
) {
  const Comp = as
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="eyebrow block">
          {label}
        </label>
      )}
      <Comp
        ref={ref}
        className={cn('input-boxed', error && 'border-terracota', className)}
        {...props}
      />
      {hint && !error && <p className="text-xs text-sepia">{hint}</p>}
      {error && <p className="text-xs text-terracota">{error}</p>}
    </div>
  )
})

export default Input
