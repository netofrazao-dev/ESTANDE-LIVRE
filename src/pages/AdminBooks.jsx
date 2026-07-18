import { useEffect, useState } from 'react';
import {
  listAllBooksForAdmin,
  createBook,
  updateBook,
  setBookActive,
} from '../services/books.service';
import { listCategories } from '../services/categories.service';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import AdminNav from '../components/layout/AdminNav';
import BookFormModal from '../components/admin/BookFormModal';
import { formatCurrency } from '../utils/rentalRules';

export default function AdminBooks() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookInModal, setBookInModal] = useState(null); // null = fechado, {} = criar, objeto = editar
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  function loadData() {
    setIsLoading(true);
    setError(null);
    return Promise.all([listAllBooksForAdmin(), listCategories()])
      .then(([booksData, categoriesData]) => {
        setBooks(booksData);
        setCategories(categoriesData);
      })
      .catch((err) => setError(err.message ?? 'Não foi possível carregar os livros.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(payload) {
    setIsSubmitting(true);
    try {
      if (bookInModal?.id) {
        const updated = await updateBook(bookInModal.id, payload);
        setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      } else {
        const created = await createBook(payload);
        setBooks((prev) => [created, ...prev]);
      }
      setBookInModal(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(book) {
    setTogglingId(book.id);
    try {
      const updated = await setBookActive(book.id, !book.is_active);
      setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch (err) {
      setError(err.message ?? 'Não foi possível atualizar o status do livro.');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-14 md:px-12">
      <AdminNav />

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-moss-600">
            Painel administrativo
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-wood-800">Acervo</h1>
          <p className="mt-1 font-sans text-wood-500">{books.length} livro(s) cadastrado(s)</p>
        </div>
        <Button variant="primary" onClick={() => setBookInModal({})}>
          + Novo livro
        </Button>
      </header>

      {error && <p className="mb-4 font-sans text-sm font-medium text-terracotta-600">{error}</p>}

      {isLoading ? (
        <p className="font-serif italic text-wood-500">Carregando acervo...</p>
      ) : books.length === 0 ? (
        <div className="rounded-md border border-dashed border-wood-300 bg-parchment-light p-10 text-center">
          <p className="font-serif text-lg italic text-wood-500">Nenhum livro cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-wood-200 bg-parchment-light shadow-shelf">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-wood-200 bg-wood-50">
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">Livro</th>
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">Categoria</th>
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">Cópias</th>
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">Preço/dia</th>
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">Status</th>
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id} className="border-b border-wood-100 last:border-0 transition-colors duration-200 hover:bg-wood-50/70">
                  <td className="px-5 py-4">
                    <p className="font-serif text-sm font-semibold text-wood-800">{book.title}</p>
                    <p className="font-sans text-xs text-wood-500">{book.author}</p>
                  </td>
                  <td className="px-5 py-4 font-sans text-sm text-wood-600">
                    {book.categories?.name ?? '—'}
                  </td>
                  <td className="px-5 py-4 font-sans text-sm text-wood-600">
                    {book.available_copies} / {book.total_copies}
                  </td>
                  <td className="px-5 py-4 font-sans text-sm text-wood-600">
                    {formatCurrency(book.daily_rental_price)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge status={book.is_active ? 'available' : 'reserved'}>
                      {book.is_active ? 'Ativo' : 'Arquivado'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setBookInModal(book)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        isLoading={togglingId === book.id}
                        onClick={() => handleToggleActive(book)}
                      >
                        {book.is_active ? 'Arquivar' : 'Reativar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bookInModal && (
        <BookFormModal
          book={bookInModal.id ? bookInModal : null}
          categories={categories}
          onClose={() => setBookInModal(null)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
