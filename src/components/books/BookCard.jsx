import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import Badge from '../ui/Badge'

export default function BookCard({ book, showFicha = true, isNew = false }) {
  const isAvailable = (book.available_copies || 0) > 0
  const catalogNumber = String(book.catalog_number || book.id?.slice(0, 8) || '000000').toUpperCase()

  return (
    <Link
      to={`/livro/${book.slug}`}
      className="book-card group block relative"
      aria-label={`${book.title}, de ${book.author}`}
    >
      {/* Capa */}
      <div className="relative aspect-[2/3] overflow-hidden bg-pergaminho-darker">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sepia/40">
            <BookOpen className="w-12 h-12" />
          </div>
        )}

        {/* Overlay de indisponível */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-cafe/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="carimbo carimbo-terracota bg-pergaminho">Emprestado</span>
          </div>
        )}

        {/* Selo de novidade */}
        {isNew && isAvailable && (
          <div className="absolute top-3 left-3">
            <Badge variant="musgo" className="animate-stamp">Recém-chegado</Badge>
          </div>
        )}
      </div>

      {/* Ficha catalográfica */}
      {showFicha && (
        <div className="p-4 border-t border-sepia/15 bg-pergaminho">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="font-mono text-[10px] text-sepia tracking-widest">
              № {catalogNumber}
            </span>
            {book.category && (
              <span className="eyebrow text-[9px]">{book.category.name}</span>
            )}
          </div>

          <h3 className="font-display text-lg leading-tight text-cafe line-clamp-2 text-balance">
            {book.title}
          </h3>
          <p className="text-xs text-cafe/60 mt-1 line-clamp-1">
            {book.author}
          </p>

          <div className="mt-3 pt-3 border-t border-sepia/10 flex items-center justify-between text-[10px] font-mono text-sepia">
            <span>{book.pages ? `${book.pages} pág.` : '—'}</span>
            <span className={cn(isAvailable ? 'text-musgo' : 'text-terracota')}>
              {isAvailable ? `${book.available_copies} exemplar${book.available_copies > 1 ? 'es' : ''}` : 'esgotado'}
            </span>
          </div>
        </div>
      )}
    </Link>
  )
}
