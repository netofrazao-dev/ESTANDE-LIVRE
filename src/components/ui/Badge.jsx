/**
 * Badge — etiqueta de status, como um carimbo em ficha de biblioteca.
 *
 * Status suportados: 'available' | 'rented' | 'reserved'
 * Também aceita `tone` genérico ('moss' | 'terracotta' | 'wood') para outros usos.
 */
const STATUS_CONFIG = {
  available: {
    label: 'Disponível',
    classes: 'bg-moss-100 text-moss-700 ring-moss-300/60',
    dot: 'bg-moss-500',
  },
  rented: {
    label: 'Alugado',
    classes: 'bg-terracotta-100 text-terracotta-700 ring-terracotta-300/60',
    dot: 'bg-terracotta-500',
  },
  reserved: {
    label: 'Reservado',
    classes: 'bg-wood-100 text-wood-700 ring-wood-300/60',
    dot: 'bg-wood-500',
  },
  active: {
    label: 'Em posse',
    classes: 'bg-moss-100 text-moss-700 ring-moss-300/60',
    dot: 'bg-moss-500',
  },
  overdue: {
    label: 'Atrasado',
    classes: 'bg-terracotta-100 text-terracotta-800 ring-terracotta-400/70',
    dot: 'bg-terracotta-700',
  },
};

export default function Badge({ status, children, dot = true, className = '' }) {
  const config = STATUS_CONFIG[status];
  const label = children ?? config?.label ?? status;
  const classes = config?.classes ?? 'bg-wood-100 text-wood-700 ring-wood-300/60';
  const dotColor = config?.dot ?? 'bg-wood-500';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full px-2.5 py-1
        font-sans text-[11px] font-semibold uppercase tracking-wide
        ring-1 ring-inset
        ${classes}
        ${className}
      `}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} aria-hidden="true" />}
      {label}
    </span>
  );
}
