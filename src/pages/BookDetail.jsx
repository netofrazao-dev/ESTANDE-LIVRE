import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBookById } from '../services/books.service';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useCartStore } from '../store/useCartStore';
import { formatCurrency } from '../utils/rentalRules';

export default function BookDetail() {
  const { id } = useParams();

  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const lastError = useCartStore((state) => state.lastError);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getBookById(id)
      .then((data) => {
        if (isMounted) setBook(data);
      })
      .catch(() => {
        if (isMounted) setError('Não encontramos esse livro na nossa estante.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="font-serif italic text-wood-500">Procurando na estante...</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="font-serif text-lg italic text-wood-500">{error}</p>
        <Link to="/" className="mt-4 inline-block font-sans text-sm font-semibold text-moss-700 hover:underline">
          ← Voltar ao catálogo
        </Link>
      </div>
    );
  }

  const inCart = items.some((item) => item.id === book.id);
  const isCartFull = items.length >= 3;
  const isAvailable = book.available_copies > 0;
  const addDisabled = !isAvailable || (isCartFull && !inCart);

  const handleToggleCart = () => {
    if (inCart) {
      removeItem(book.id);
      return;
    }
    addItem(book);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-14 md:px-12">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-1.5 font-sans text-sm text-wood-500 transition-colors duration-300 hover:text-wood-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Voltar ao catálogo
      </Link>

      <div className="grid gap-10 md:grid-cols-[280px_1fr]">
        {/* Capa */}
        <div className="relative mx-auto w-full max-w-[220px] shrink-0 md:mx-0 md:max-w-none">
          <div className="aspect-[2/3] w-full overflow-hidden rounded-md bg-wood-100 shadow-shelf ring-1 ring-wood-200/70">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={`Capa do livro ${book.title}`}
                className="h-full w-full object-cover"
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
          </div>
        </div>

        {/* Informações */}
        <div>
          {book.categories?.name && (
            <span className="mb-3 inline-block rounded-full border border-moss-300/60 bg-moss-50 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wide text-moss-700">
              {book.categories.name}
            </span>
          )}

          <h1 className="font-serif text-3xl font-bold leading-tight text-wood-800 md:text-4xl">
            {book.title}
          </h1>
          <p className="mt-1.5 font-sans text-lg text-wood-500">{book.author}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge status={isAvailable ? 'available' : 'rented'} />
            {book.daily_rental_price != null && (
              <span className="font-serif text-lg font-semibold text-moss-700">
                {formatCurrency(book.daily_rental_price)}
                <span className="font-sans text-sm font-normal text-wood-400"> / dia</span>
              </span>
            )}
          </div>

          {book.synopsis && (
            <p className="mt-6 max-w-xl font-sans leading-relaxed text-wood-600">{book.synopsis}</p>
          )}

          <dl className="mt-6 grid max-w-md grid-cols-2 gap-x-6 gap-y-2 border-t border-dashed border-wood-200 pt-5 font-sans text-sm">
            {book.publisher && (
              <>
                <dt className="text-wood-400">Editora</dt>
                <dd className="text-wood-700">{book.publisher}</dd>
              </>
            )}
            {book.published_year && (
              <>
                <dt className="text-wood-400">Ano</dt>
                <dd className="text-wood-700">{book.published_year}</dd>
              </>
            )}
            {book.isbn && (
              <>
                <dt className="text-wood-400">ISBN</dt>
                <dd className="text-wood-700">{book.isbn}</dd>
              </>
            )}
            <dt className="text-wood-400">Idioma</dt>
            <dd className="text-wood-700">{book.language ?? 'pt-BR'}</dd>
          </dl>

          {lastError && (
            <p className="mt-4 font-sans text-sm font-medium text-terracotta-600">{lastError}</p>
          )}

          <div className="mt-8">
            <Button
              variant={inCart ? 'ghost' : 'primary'}
              size="lg"
              disabled={addDisabled}
              onClick={handleToggleCart}
              title={
                !isAvailable
                  ? 'Sem cópias disponíveis'
                  : addDisabled
                  ? 'Sacola cheia (máx. 3)'
                  : undefined
              }
            >
              {!isAvailable
                ? 'Sem cópias disponíveis'
                : inCart
                ? 'Remover da sacola'
                : 'Adicionar à sacola'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
