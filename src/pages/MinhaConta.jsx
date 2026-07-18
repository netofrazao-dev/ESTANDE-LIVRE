import { useEffect, useState } from 'react';
import { fetchMyActiveRentals, isOverdue } from '../services/rentals.service';
import { useAuthStore, selectDisplayName } from '../store/useAuthStore';
import Badge from '../components/ui/Badge';
import DueDateAlert from '../components/rentals/DueDateAlert';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function MinhaConta() {
  const userId = useAuthStore((s) => s.user?.id);
  const displayName = useAuthStore(selectDisplayName);

  const [rentals, setRentals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    setIsLoading(true);

    fetchMyActiveRentals(userId)
      .then((data) => {
        if (isMounted) setRentals(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message ?? 'Não foi possível carregar seus aluguéis.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-14 md:px-12">
      <header className="mb-10">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-moss-600">
          Minha conta
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-wood-800">
          Olá, {displayName || 'leitor'}
        </h1>
        <p className="mt-1 font-sans text-wood-500">
          Aqui estão os livros que você tem em mãos no momento.
        </p>
      </header>

      {isLoading && <p className="font-serif italic text-wood-500">Consultando sua estante...</p>}

      {error && <p className="font-sans text-sm font-medium text-terracotta-600">{error}</p>}

      {!isLoading && !error && rentals.length === 0 && (
        <div className="rounded-md border border-dashed border-wood-300 bg-parchment-light p-10 text-center">
          <p className="font-serif text-lg italic text-wood-500">
            Você não tem nenhum livro alugado agora.
          </p>
          <a href="/" className="mt-2 inline-block font-sans text-sm font-semibold text-moss-700 hover:underline">
            Ir para o catálogo →
          </a>
        </div>
      )}

      {!isLoading && rentals.length > 0 && (
        <ul className="space-y-4">
          {rentals.map((rental) => {
            const overdue = isOverdue(rental);
            const book = rental.books;

            return (
              <li
                key={rental.id}
                className={`
                  rounded-md border bg-parchment-light p-4 shadow-shelf
                  ${overdue ? 'border-terracotta-300' : 'border-wood-200'}
                `}
              >
                <div className="flex items-center gap-4">
                  <div className="h-24 w-16 shrink-0 overflow-hidden rounded-sm bg-wood-100">
                    {book?.cover_url ? (
                      <img src={book.cover_url} alt={`Capa de ${book.title}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-wood-100 to-wood-200 text-wood-400">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-serif text-lg font-semibold text-wood-800">
                      {book?.title ?? 'Livro'}
                    </h3>
                    <p className="font-sans text-sm text-wood-500">{book?.author}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2 text-right">
                    <Badge status={overdue ? 'overdue' : 'active'} />
                    <p
                      className={`font-sans text-sm ${
                        overdue ? 'font-semibold text-terracotta-700' : 'text-wood-600'
                      }`}
                    >
                      Devolver até <span className="font-semibold">{formatDate(rental.due_date)}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <DueDateAlert dueDate={rental.due_date} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
