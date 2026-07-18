import { useEffect, useState } from 'react';
import { fetchAllActiveRentals, confirmReturn, isOverdue } from '../services/rentals.service';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ReturnConfirmModal from '../components/rentals/ReturnConfirmModal';
import AdminNav from '../components/layout/AdminNav';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminDashboard() {
  const [rentals, setRentals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rentalInModal, setRentalInModal] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  function loadRentals() {
    setIsLoading(true);
    setError(null);
    return fetchAllActiveRentals()
      .then(setRentals)
      .catch((err) => setError(err.message ?? 'Não foi possível carregar os empréstimos.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadRentals();
  }, []);

  async function handleConfirmReturn(rentalId, extra) {
    setIsConfirming(true);
    try {
      await confirmReturn(rentalId, extra);
      setRentals((prev) => prev.filter((r) => r.id !== rentalId));
      setRentalInModal(null);
    } catch (err) {
      setError(err.message ?? 'Não foi possível confirmar a devolução.');
    } finally {
      setIsConfirming(false);
    }
  }

  const overdueCount = rentals.filter(isOverdue).length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-14 md:px-12">
      <AdminNav />

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-moss-600">
            Painel administrativo
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-wood-800">Empréstimos ativos</h1>
          <p className="mt-1 font-sans text-wood-500">
            {rentals.length} empréstimo(s) em aberto
            {overdueCount > 0 && (
              <span className="font-semibold text-terracotta-700"> · {overdueCount} atrasado(s)</span>
            )}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadRentals}>
          Atualizar lista
        </Button>
      </header>

      {error && <p className="mb-4 font-sans text-sm font-medium text-terracotta-600">{error}</p>}

      {isLoading ? (
        <p className="font-serif italic text-wood-500">Carregando registros do acervo...</p>
      ) : rentals.length === 0 ? (
        <div className="rounded-md border border-dashed border-wood-300 bg-parchment-light p-10 text-center">
          <p className="font-serif text-lg italic text-wood-500">
            Nenhum empréstimo ativo no momento.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-wood-200 bg-parchment-light shadow-shelf">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-wood-200 bg-wood-50">
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">
                  Livro
                </th>
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">
                  Leitor
                </th>
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">
                  Alugado em
                </th>
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">
                  Devolução prevista
                </th>
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">
                  Status
                </th>
                <th className="px-5 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-wood-600">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((rental) => {
                const overdue = isOverdue(rental);
                return (
                  <tr
                    key={rental.id}
                    className={`
                      border-b border-wood-100 last:border-0
                      transition-colors duration-200 hover:bg-wood-50/70
                      ${overdue ? 'bg-terracotta-50/40' : ''}
                    `}
                  >
                    <td className="px-5 py-4">
                      <p className="font-serif text-sm font-semibold text-wood-800">
                        {rental.books?.title ?? '—'}
                      </p>
                      <p className="font-sans text-xs text-wood-500">{rental.books?.author}</p>
                    </td>
                    <td className="px-5 py-4 font-sans text-sm text-wood-700">
                      <p>{rental.users?.full_name ?? '—'}</p>
                      <p className="text-xs text-wood-400">{rental.users?.email}</p>
                    </td>
                    <td className="px-5 py-4 font-sans text-sm text-wood-600">
                      {formatDate(rental.rented_at?.slice(0, 10))}
                    </td>
                    <td
                      className={`px-5 py-4 font-sans text-sm ${
                        overdue ? 'font-bold text-terracotta-700' : 'text-wood-600'
                      }`}
                    >
                      {formatDate(rental.due_date)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={overdue ? 'overdue' : 'active'} />
                    </td>
                    <td className="px-5 py-4">
                      <Button variant="secondary" size="sm" onClick={() => setRentalInModal(rental)}>
                        Confirmar devolução
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rentalInModal && (
        <ReturnConfirmModal
          rental={rentalInModal}
          onClose={() => setRentalInModal(null)}
          onConfirm={handleConfirmReturn}
          isSubmitting={isConfirming}
        />
      )}
    </div>
  );
}
