import { AnimatePresence, motion } from 'framer-motion'
import { X, ShoppingBag, Trash2, ArrowRight, BookOpen } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatDatador, previewDueDate } from '@/lib/utils'
import Button from '../ui/Button'

export default function CartSlideOver() {
  const { isOpen, close, items, removeBook } = useCartStore()
  const user = useAuthStore((s) => s.user)
  const { maxBooksPerRental, rentalDays, dailyFine } = useSettingsStore()
  const navigate = useNavigate()

  const dueDate = previewDueDate(rentalDays)

  const handleCheckout = () => {
    close()
    if (!user) {
      navigate('/entrar', { state: { from: { pathname: '/checkout' } } })
    } else {
      navigate('/checkout')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-cafe/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-pergaminho border-l border-sepia/20 flex flex-col"
          >
            {/* Cabeçalho */}
            <div className="px-6 py-5 border-b border-sepia/15 flex items-center justify-between">
              <div>
                <div className="eyebrow">Sacola de leitura</div>
                <div className="font-display text-2xl mt-1">
                  {items.length} de {maxBooksPerRental}
                </div>
              </div>
              <button
                onClick={close}
                className="text-sepia hover:text-cafe transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Itens */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center px-8 text-center">
                  <ShoppingBag className="w-10 h-10 text-sepia mb-4" />
                  <h3 className="font-display text-xl mb-2">Sua sacola está vazia</h3>
                  <p className="text-sm text-cafe/60 mb-6 text-pretty">
                    Passe pelo acervo e escolha até {maxBooksPerRental} títulos por locação.
                  </p>
                  <Link to="/acervo" onClick={close}>
                    <Button variant="secondary">Explorar acervo</Button>
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-sepia/10">
                  {items.map((item) => (
                    <li key={item.book_id} className="p-6 flex gap-4">
                      <Link
                        to={`/livro/${item.slug}`}
                        onClick={close}
                        className="w-16 h-24 bg-pergaminho-darker flex-shrink-0 overflow-hidden"
                      >
                        {item.cover_url ? (
                          <img
                            src={item.cover_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sepia/40">
                            <BookOpen className="w-5 h-5" />
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/livro/${item.slug}`}
                          onClick={close}
                          className="font-display text-base leading-tight hover:text-musgo transition-colors block"
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-cafe/60 mt-1">{item.author}</p>
                      </div>
                      <button
                        onClick={() => removeBook(item.book_id)}
                        className="text-sepia hover:text-terracota transition-colors self-start p-1"
                        aria-label="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Rodapé com previsão de devolução */}
            {items.length > 0 && (
              <div className="border-t border-sepia/15 p-6 space-y-4 bg-pergaminho-dark/30">
                <div className="ficha">
                  <div className="eyebrow mb-2">Previsão de devolução</div>
                  <div className="font-mono text-lg text-cafe tabular-nums">
                    {formatDatador(dueDate)}
                  </div>
                  <p className="text-[11px] text-cafe/60 mt-2 text-pretty">
                    Prazo de {rentalDays} dias corridos.
                    Após esta data, multa de R$ {dailyFine.toFixed(2).replace('.', ',')} por dia.
                  </p>
                </div>

                <Button onClick={handleCheckout} className="w-full">
                  Ir para o termo de locação
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
