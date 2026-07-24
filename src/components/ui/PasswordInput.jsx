import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const PasswordInput = forwardRef(function PasswordInput(
  { label, error, hint, className, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-1.5">
      {label && <label className="eyebrow block">{label}</label>}
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('input-boxed pr-10', error && 'border-terracota', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sepia hover:text-cafe transition-colors"
          tabIndex={-1}
          aria-label={visible ? 'Esconder senha' : 'Mostrar senha'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && !error && <p className="text-xs text-sepia">{hint}</p>}
      {error && <p className="text-xs text-terracota">{error}</p>}
    </div>
  )
})

export default PasswordInput
