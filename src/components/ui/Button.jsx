import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-musgo text-pergaminho hover:bg-musgo-dark',
  secondary: 'bg-transparent text-cafe border border-cafe/20 hover:border-cafe hover:bg-cafe/5',
  terracota: 'bg-terracota text-pergaminho hover:bg-terracota-dark',
  ghost: 'bg-transparent text-cafe hover:bg-cafe/5',
  danger: 'bg-transparent text-terracota border border-terracota/30 hover:bg-terracota hover:text-pergaminho',
}

const sizes = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  as: Component = 'button',
  ...props
}) {
  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </Component>
  )
}
