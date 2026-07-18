import Badge from '../ui/Badge';

/**
 * BookCard — ficha de catálogo de um livro.
 *
 * Espera um objeto `book` no formato:
 * {
 *   id, title, author, cover_url, available_copies, daily_rental_price
 * }
 *
 * Micro-interação: no hover, o card "sai da estante" — sobe levemente,
 * a sombra ganha profundidade e a capa recebe um leve zoom.
 *
 * Props opcionais:
 *  - onOpen(book)       → clique no card (ver detalhes)
 *  - onAddToCart(book)  → clique no botão de adicionar à sacola
 *  - inCart: boolean    → já está na sacola?
 *  - cartFull: boolean  → sacola no limite (desabilita o botão se ainda não estiver no carrinho)
 */
export default function BookCard({ book, onOpen, onAddToCart, inCart = false, cartFull = false }) {
  const {
    title = 'Título desconhecido',
    author = 'Autor desconhecido',
    cover_url: coverUrl,
    available_copies: availableCopies = 0,
    daily_rental_price: dailyPrice,
  } = book ?? {};

  const isAvailable = availableCopies > 0;
  const status = isAvailable ? 'available' : 'rented';
  const addDisabled = !isAvailable || (cartFull && !inCart);

  const handleOpen = () => onOpen?.(book);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    }
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    if (addDisabled) return;
    onAddToCart?.(book);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      className="
        group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-md
        bg-parchment-light text-left
        ring-1 ring-wood-200/70
        shadow-[0_2px_6px_-2px_rgba(44,29,17,0.18)]
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-[0_18px_28px_-12px_rgba(44,29,17,0.35)]
        hover:ring-wood-300
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-moss-500
      "
    >
      {/* Capa */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-wood-100">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`Capa do livro ${title}`}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-wood-100 to-wood-200 px-4 text-center">
            <svg
              className="h-10 w-10 text-wood-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            <span className="font-serif text-xs italic text-wood-500">Sem capa disponível</span>
          </div>
        )}

        {/* Sombra de "lombada" na borda esquerda — simula profundidade de livro físico */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/15 to-transparent" />

        <div className="absolute right-2 top-2">
          <Badge status={status} />
        </div>

        {/* Botão de adicionar à sacola — flutua sobre a capa */}
        {onAddToCart && (
          <button
            type="button"
            onClick={handleAddClick}
            disabled={addDisabled}
            title={
              !isAvailable
                ? 'Sem cópias disponíveis'
                : addDisabled
                ? 'Sacola cheia (máx. 3)'
                : inCart
                ? 'Remover da sacola'
                : 'Adicionar à sacola'
            }
            className={`
              absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full
              shadow-shelf ring-1 ring-wood-200/70
              transition-all duration-300 ease-out
              disabled:cursor-not-allowed disabled:opacity-40
              ${inCart ? 'bg-moss-600 text-parchment' : 'bg-parchment-light text-wood-700 hover:bg-moss-600 hover:text-parchment'}
            `}
          >
            {inCart ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Informações */}
      <div className="flex flex-1 flex-col gap-1 px-4 py-3.5">
        <h3 className="font-serif text-base font-semibold leading-snug text-wood-800 line-clamp-2">
          {title}
        </h3>
        <p className="font-sans text-sm text-wood-500">{author}</p>

        {dailyPrice != null && (
          <div className="mt-2 flex items-baseline gap-1 border-t border-dashed border-wood-200 pt-2">
            <span className="font-serif text-sm font-semibold text-moss-700">
              R$ {Number(dailyPrice).toFixed(2).replace('.', ',')}
            </span>
            <span className="font-sans text-[11px] text-wood-400">/ dia</span>
          </div>
        )}
      </div>
    </div>
  );
}
