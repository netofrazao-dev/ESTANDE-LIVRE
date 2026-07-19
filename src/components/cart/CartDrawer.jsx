import { useEffect, useState } from 'react';
import { useCartStore, MAX_CART_ITEMS } from '../../store/useCartStore';
import Button from '../ui/Button';
import RentalTermsBox from '../rentals/RentalTermsBox';

export default function CartDrawer({ onCheckout, isSubmitting = false, checkoutError = null }) {
  const isOpen = useCartStore((state) => state.isOpen);
  const items = useCartStore((state) => state.items);
  const closeCart = useCartStore((state) => state.closeCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Reseta o aceite depois que a sacola esvazia (ex: checkout concluído).
  useEffect(() => {
    if (items.length === 0) setTermsAccepted(false);
  }, [items.length]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={closeCart}
        aria-hidden="true"
        className={`
          fixed inset-0 z-50 bg-wood-900/40 backdrop-blur-[2px]
          transition-opacity duration-300 ease-out
          ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}
        `}
      />

      {/* Painel lateral */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sacola de leitura"
        className={`
          fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col
          bg-parchment shadow-[-12px_0_32px_-8px_rgba(44,29,17,0.3)]
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-wood-200 px-6 py-5">
          <div>
            <h2 className="font-serif text-xl font-semibold text-wood-800">Sua sacola</h2>
            <p className="font-sans text-xs text-wood-500">
              {items.length} de {MAX_CART_ITEMS} livros selecionados
            </p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Fechar sacola"
            className="flex h-9 w-9 items-center justify-center rounded-full text-wood-500 transition-colors duration-300 hover:bg-wood-100 hover:text-wood-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lista de itens */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <svg
                className="h-12 w-12 text-wood-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.4}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 8.25V6a4.5 4.5 0 10-9 0v2.25M4.5 8.25h15l-1.05 11.55a1.5 1.5 0 01-1.494 1.35H7.044a1.5 1.5 0 01-1.494-1.35L4.5 8.25z"
                />
              </svg>
              <p className="font-serif text-base italic text-wood-500">
                Sua sacola ainda está vazia.
              </p>
              <p className="max-w-[220px] font-sans text-sm text-wood-400">
                Escolha até {MAX_CART_ITEMS} livros no catálogo para começar seu aluguel.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((book) => (
                <li
                  key={book.id}
                  className="flex gap-3 rounded-md border border-wood-200 bg-parchment-light p-3 shadow-shelf"
                >
                  <div className="h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-wood-100">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={`Capa de ${book.title}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-wood-100 to-wood-200 text-wood-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between py-0.5">
                    <div>
                      <h3 className="font-serif text-sm font-semibold leading-snug text-wood-800 line-clamp-2">
                        {book.title}
                      </h3>
                      <p className="font-sans text-xs text-wood-500">{book.author}</p>
                    </div>
                    {book.daily_rental_price != null && (
                      <span className="font-sans text-xs font-semibold text-moss-700">
                        R$ {Number(book.daily_rental_price).toFixed(2).replace('.', ',')} / dia
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(book.id)}
                    aria-label={`Remover ${book.title} da sacola`}
                    className="self-start rounded-full p-1.5 text-wood-400 transition-colors duration-300 hover:bg-terracotta-50 hover:text-terracotta-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Termos de locação — obrigatório antes de finalizar */}
        {items.length > 0 && (
          <div className="border-t border-wood-200 px-6 py-5">
            <p className="mb-4 rounded-sm bg-wood-50 px-3 py-2 font-sans text-xs text-wood-600">
              💳 Reserva 100% online — o pagamento é feito no balcão, na retirada dos livros.
            </p>
            <RentalTermsBox accepted={termsAccepted} onAcceptedChange={setTermsAccepted} />
          </div>
        )}

        {/* Rodapé / CTA */}
        <div className="border-t border-wood-200 px-6 py-5">
          {checkoutError && (
            <p className="mb-3 font-sans text-sm font-medium text-terracotta-600">
              {checkoutError}
              {checkoutError.includes('entrar na sua conta') && (
                <>
                  {' '}
                  <a href="/entrar" className="underline hover:text-terracotta-700">
                    Entrar agora
                  </a>
                </>
              )}
            </p>
          )}
          <Button
            variant="primary"
            fullWidth
            disabled={items.length === 0 || !termsAccepted}
            isLoading={isSubmitting}
            onClick={() => onCheckout?.({ termsAccepted })}
          >
            Avançar para aluguel
          </Button>
        </div>
      </aside>
    </>
  );
}
