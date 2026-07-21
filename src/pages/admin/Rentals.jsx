import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAllRentals } from '@/hooks/useRentals'
import { calculateFine, formatDatador, formatMoney, rentalStatusLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { AlertTriangle, CircleDollarSign } from 'lucide-react'
import FinePaymentModal from '@/components/admin/FinePaymentModal'

const filters = [
  { key: '', label: 'Todos' },
  { key: 'active', label: 'Em curso' },
  { key: 'returned', label: 'Devolvidos' },
  { key: 'damaged', label: 'Com dano' },
  { key: 'lost', label: 'Extraviados' },
]

export default function AdminRentals() {
  const [statusFilter, setStatusFilter] = useState('')
  const [paying, setPaying] = useState(null)
  const { data: rentals = [], isLoading } = useAllRentals(
    statusFilter ? { status: statusFilter } : {},
  )

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow mb-2">Logística</div>
        <h1 className="font-display text-display-md">Controle de empréstimos</h1>
        <p className="text-sm text-cafe/70 mt-2">
          Quem está com o quê, o que já voltou, o que precisa voltar.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium border transition-colors',
              statusFilter === f.key
                ? 'bg-cafe text-pergaminho border-cafe'
                : 'border-sepia/30 text-cafe/70 hover:border-cafe hover:text-cafe',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="border border-sepia/15 overflow-x-auto bg-pergaminho">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-pergaminho-dark/40 border-b border-sepia/15">
            <tr>
              <th className="text-left px-4 py-3 eyebrow">Leitor</th>
              <th className="text-left px-4 py-3 eyebrow">Livro</th>
              <th className="text-left px-4 py-3 eyebrow">Retirado</th>
              <th className="text-left px-4 py-3 eyebrow">Devolver até</th>
              <th className="text-left px-4 py-3 eyebrow">Status</th>
              <th className="text-right px-4 py-3 eyebrow">Multa</th>
              <th className="text-right px-4 py-3 eyebrow w-16">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sepia/10">
            {isLoading ? (
              <tr><td colSpan="7" className="text-center py-10 text-sepia">Carregando…</td></tr>
            ) : rentals.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-10 text-sepia">Nenhum registro.</td></tr>
            ) : (
              rentals.map((r) => {
                const isActive = r.status === 'active'
                const fine = isActive ? calculateFine(r.due_date, new Date(), r.daily_fine_rate) : { amount: 0, isLate: false }
                const isReturnedWithDebt =
                  !isActive &&
                  ((r.late_fee > 0 && !r.late_fee_paid) || (r.damage_fee > 0 && !r.damage_fee_paid))
                const totalFee = isActive
                  ? fine.amount
                  : (r.late_fee || 0) + (r.damage_fee || 0)

                return (
                  <tr
                    key={r.id}
                    className={cn(
                      'hover:bg-pergaminho-dark/20 transition-colors',
                      (fine.isLate || isReturnedWithDebt) && 'bg-terracota/5',
                    )}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/leitores/${r.user?.id}`}
                        className="font-medium text-sm hover:text-musgo transition-colors"
                      >
                        {r.user?.full_name}
                      </Link>
                      <div className="text-xs text-cafe/60">{r.user?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{r.book?.title}</div>
                      <div className="text-xs text-cafe/60">{r.book?.author}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-cafe/70 whitespace-nowrap">
                      {formatDatador(r.rented_at)}
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-xs font-mono whitespace-nowrap',
                      fine.isLate && 'text-terracota font-semibold',
                    )}>
                      {formatDatador(r.due_date)}
                      {r.renewals_count > 0 && (
                        <span className="ml-1.5 text-[9px] text-sepia">· renovado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {fine.isLate ? (
                        <span className="carimbo carimbo-terracota inline-flex items-center gap-1" style={{ transform: 'none' }}>
                          <AlertTriangle className="w-3 h-3" />
                          Atrasado
                        </span>
                      ) : (
                        <span className="text-xs">{rentalStatusLabel(r.status)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'font-mono text-sm tabular-nums',
                        totalFee > 0 ? (isReturnedWithDebt ? 'text-terracota' : 'text-cafe/40') : 'text-cafe/40',
                      )}>
                        {formatMoney(totalFee)}
                      </span>
                      {!isActive && totalFee > 0 && !isReturnedWithDebt && (
                        <div className="text-[9px] text-musgo">quitado</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isReturnedWithDebt && (
                        <button
                          onClick={() => setPaying(r)}
                          className="p-2 text-sepia hover:text-musgo transition-colors"
                          title="Registrar pagamento"
                        >
                          <CircleDollarSign className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {paying && <FinePaymentModal rental={paying} onClose={() => setPaying(null)} />}
    </div>
  )
}
