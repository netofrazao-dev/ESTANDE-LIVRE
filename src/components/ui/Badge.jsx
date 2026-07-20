import { cn } from '@/lib/utils'

const variants = {
  musgo: 'carimbo-musgo',
  terracota: 'carimbo-terracota',
  sepia: 'carimbo-sepia',
}

export default function Badge({ children, variant = 'sepia', className, tilt = true }) {
  return (
    <span
      className={cn('carimbo', variants[variant], className)}
      style={!tilt ? { transform: 'none' } : undefined}
    >
      {children}
    </span>
  )
}
