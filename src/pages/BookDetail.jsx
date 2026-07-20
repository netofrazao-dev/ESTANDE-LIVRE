import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Calendar, Hash, User } from 'lucide-react'
import { useBook } from '@/hooks/useBooks'
import { useCartStore } from '@/stores/cartStore'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { motion } from 'framer-motion'

export default function BookDetail() {
  const { slug } = useParams()
  const { data: book, isLoading, error } = useBook(slug)
  const addBook = useCartStore((s) => s.addBook)
  const cartItems = useCartStore((s) => s.items)

  if (isLoading) {
    return (
      <div className="container-book py-20 text-center text-sepia">Carregando…</div>
    )
  }

  if (error || !book) {
    return (
      <div className="container-book py-20 text-center">
        <p className="text-cafe mb-4">Este título não está no nosso acervo.</p>
        <Link to="/acervo" className="text-musgo underline underline-offset-4">
          Voltar ao acervo
        </Link>
      </div>
    )
  }

  const isAvailable = (book.available_copies || 0) > 0
  const inCart = cartItems.some((i) => i.book_id === book.id)
  const catalogNumber = String(book.catalog_number || book.id?.slice(0, 8)).toUpperCase()

  return (
    <div className="container-book py-12 md:py-16">
      <Link
        to="/acervo"
        className="inline-flex items-center gap-2 text-sm text-cafe/60 hover:text-cafe mb-10 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao acervo
      </Link>

      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-12 lg:gap-20">
        {/* Capa */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="aspect-[2/3] bg-pergaminho-darker overflow-hidden shadow-book-hover">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sepia/40">
                <BookOpen className="w-16 h-16" />
              </div>
            )}
          </div>

          {book.featured && (
            <div className="absolute -top-3 -left-3">
              <Badge variant="musgo">Destaque</Badge>
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="flex items-center gap-3 mb-4 text-xs">
            <span className="font-mono text-sepia tracking-widest">
              № {catalogNumber}
            </span>
            {book.category && (
              <>
                <span className="text-sepia/30">·</span>
                <span className="eyebrow">{book.category.name}</span>
              </>
            )}
          </div>

          <h1 className="font-display text-display-lg text-balance leading-[1.05]">
            {book.title}
          </h1>

          <div className="mt-4 flex items-center gap-2 text-cafe/70">
            <User className="w-4 h-4" />
            <span className="text-lg italic">{book.author}</span>
          </div>

          <div className="rule-double my-8" />

          {/* Ficha técnica */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div>
              <div className="eyebrow mb-1">Páginas</div>
              <div className="font-mono text-lg tabular-nums">{book.pages || '—'}</div>
            </div>
            <div>
              <div className="eyebrow mb-1">Editora</div>
              <div className="text-sm">{book.publisher || '—'}</div>
            </div>
            <div>
              <div className="eyebrow mb-1">Ano</div>
              <div className="font-mono text-lg tabular-nums">{book.year || '—'}</div>
            </div>
            <div>
              <div className="eyebrow mb-1">Idioma</div>
              <div className="text-sm">{book.language || 'Português'}</div>
            </div>
          </div>

          {/* Sinopse */}
          {book.synopsis && (
            <div className="mb-10">
              <div className="eyebrow mb-3">Sinopse</div>
              <div className="prose prose-sm max-w-none text-cafe/80 leading-relaxed">
                {book.synopsis.split('\n').map((p, i) => (
                  <p key={i} className="mb-3 text-pretty">{p}</p>
                ))}
              </div>
            </div>
          )}

          {/* Disponibilidade & CTA */}
          <div className="ficha bg-pergaminho-dark/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="eyebrow mb-1">Disponibilidade</div>
                <div className={`font-mono text-2xl tabular-nums ${isAvailable ? 'text-musgo' : 'text-terracota'}`}>
                  {isAvailable
                    ? `${book.available_copies} de ${book.total_copies}`
                    : 'Todos emprestados'}
                </div>
                <div className="text-xs text-sepia mt-1">
                  {isAvailable
                    ? `${book.available_copies} exemplar${book.available_copies > 1 ? 'es' : ''} disponíve${book.available_copies > 1 ? 'is' : 'l'} para retirada`
                    : 'Aguarde a devolução — deixe o e-mail e avisamos'}
                </div>
              </div>
            </div>

            <div className="rule-double mb-4" />

            <Button
              onClick={() => addBook(book)}
              disabled={!isAvailable || inCart}
              className="w-full"
            >
              {inCart
                ? '✓ Já está na sua sacola'
                : isAvailable
                  ? 'Adicionar à sacola de leitura'
                  : 'Indisponível'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
