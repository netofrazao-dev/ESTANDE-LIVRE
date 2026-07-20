import { BookOpen } from 'lucide-react'

export default function EmptyState({
  icon: Icon = BookOpen,
  title = 'Nada por aqui ainda',
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 border border-sepia/20 bg-pergaminho-dark/40 mb-6">
        <Icon className="w-8 h-8 text-sepia" />
      </div>
      <h3 className="font-display text-2xl text-cafe mb-2">{title}</h3>
      {description && (
        <p className="text-cafe/70 max-w-md text-pretty">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
