import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BookCard from '../components/books/BookCard';
import Button from '../components/ui/Button';
import { useCartStore } from '../store/useCartStore';
import { listBooks } from '../services/books.service';

export default function Home({ searchTerm = '' }) {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const lastError = useCartStore((state) => state.lastError);

  const cartIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const isCartFull = items.length >= 3;

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    listBooks()
      .then((data) => {
        if (isMounted) setBooks(data);
      })
      .catch((err) => {
        if (isMounted) setLoadError(err.message ?? 'Não foi possível carregar o catálogo.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBooks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return books;
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(term) || book.author.toLowerCase().includes(term)
    );
  }, [books, searchTerm]);

  const handleAddToCart = (book) => {
    if (cartIds.has(book.id)) {
      removeItem(book.id);
      return;
    }
    addItem(book);
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-wood-200/60 bg-gradient-to-b from-wood-100/60 via-parchment to-parchment">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, #2C1D11 0, #2C1D11 2px, transparent 2px, transparent 42px)',
          }}
        />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center md:px-12 md:py-32">
          <span className="rounded-full border border-moss-300/60 bg-moss-50 px-4 py-1.5 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-moss-700">
            Sua próxima leitura te espera
          </span>

          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-wood-800 md:text-6xl">
            Uma biblioteca inteira,
            <br />
            <span className="text-moss-700">à sua porta.</span>
          </h1>

          <p className="max-w-lg font-sans text-base leading-relaxed text-wood-500 md:text-lg">
            Alugue os livros que você sempre quis ler, sem compromisso de comprar a estante
            inteira. Receba em casa, devolva quando terminar.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Explorar catálogo
            </Button>
            <Button variant="ghost" size="lg">
              Como funciona
            </Button>
          </div>
        </div>
      </section>

      {/* Catálogo */}
      <section id="catalogo" className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20">
        <div className="mb-10 flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-wood-800">
            {searchTerm ? `Resultados para "${searchTerm}"` : 'Recém-chegados à estante'}
          </h2>
          <p className="font-sans text-wood-500">
            Escolha até 3 livros para sua sacola de leitura.
          </p>
          {lastError && (
            <p className="font-sans text-sm font-medium text-terracotta-600">{lastError}</p>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-md bg-wood-100"
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {!isLoading && loadError && (
          <p className="py-12 text-center font-sans text-sm font-medium text-terracotta-600">
            {loadError}
          </p>
        )}

        {!isLoading && !loadError && filteredBooks.length === 0 && (
          <p className="py-12 text-center font-serif text-lg italic text-wood-500">
            Nenhum livro encontrado com esse termo.
          </p>
        )}

        {!isLoading && !loadError && filteredBooks.length > 0 && (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                inCart={cartIds.has(book.id)}
                cartFull={isCartFull}
                onOpen={(b) => navigate(`/livro/${b.id}`)}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
