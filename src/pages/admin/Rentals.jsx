import { useState, useMemo } from 'react'
import {
  AlertTriangle, Truck, Store, BookOpen, PackageCheck, Clock3,
  CircleDollarSign, ChevronRight,
} from 'lucide-react'
import { useAllRentals } from '@/hooks/useRentals'
import { useBooksWithActiveWaitlist } from '@/hooks/usePricing'
import { groupRentalsIntoOrders } from '@/lib/orders'
import { computeRentalFine, formatDatador, formatMoney, cn } from '@/lib/utils'
import OrderDetailModal from '@/components/admin/OrderDetailModal'

const statusFilters = [
  { key: '', label: 'Todos' },
  { key: 'active', label: 'Em curso' },
  { key: 'returned', label: 'Devolvidos' },
  { key: 'damaged', label: 'Com dano' },
  { key: 'lost', label: 'Extraviados' },
]

export default function AdminRentals() {
  const [statusFilter, setStatusFilter] = useState('')
  const [onlyUnpaid, setOnlyUnpaid] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  const { data: rentals = [], isLoading } = useAllRentals(
    statusFilter ? { status: statusFilter } : {},
  )
  const { data: waitlistSet = new Set() } = useBooksWithActiveWaitlist()

  const orders = useMemo(() => groupRentalsIntoOrders(rentals), [rentals])

  const filtered = onlyUnpaid ? orders.filter((o) => !o.allPaid) : orders

  const pending = filtered.filter((o) => !o.allDelivered)
  const fulfilled = filtered.filter((o) => o.allDelivered)

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow mb-2">Logística</div>
        <h1 className="font-display text-display-md">Controle de empréstimos</h1>
        <p className="text-sm text-cafe/70 mt-2">
          Cada linha é um pedido — clique para ver o endereço, os livros e registrar pagamento
          ou entrega.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {statusFilters.map((f) => (
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
        <div className="w-px h-5 bg-sepia/20 mx-1" />
        <button
          onClick={() => setOnlyUnpaid(!onlyUnpaid)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium border transition-colors flex items-center gap-1.5',
            onlyUnpaid
              ? 'bg-terracota text-pergaminho border-terracota'
              : 'border-sepia/30 text-cafe/70 hover:border-terracota hover:text-terracota',
          )}
        >
          <CircleDollarSign className="w-3.5 h-3.5" /> Só pendentes de pagamento
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-sepia">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="ficha text-center py-16">
          <div className="font-display text-xl mb-1">Nenhum pedido encontrado</div>
          <p className="text-sm text-cafe/60">Ajuste os filtros ou aguarde novas locações.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Aguardando retirada/entrega */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock3 className="w-4 h-4 text-terracota" />
              <h2 className="font-display text-xl">Aguardando retirada/entrega</h2>
              <span className="font-mono text-xs text-sepia">({pending.length})</span>
            </div>
            {pending.length === 0 ? (
              <div className="text-sm text-sepia py-4">Nenhum pedido pendente — tudo entregue.</div>
            ) : (
              <div className="space-y-2">
                {pending.map((order) => (
                  <OrderRow
                    key={order.orderId}
                    order={order}
                    waitlistSet={waitlistSet}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Já entregues/retirados */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <PackageCheck className="w-4 h-4 text-musgo" />
              <h2 className="font-display text-xl">Já entregues / retirados</h2>
              <span className="font-mono text-xs text-sepia">({fulfilled.length})</span>
            </div>
            {fulfilled.length === 0 ? (
              <div className="text-sm text-sepia py-4">Nenhum pedido confirmado ainda.</div>
            ) : (
              <div className="space-y-2">
                {fulfilled.map((order) => (
                  <OrderRow
                    key={order.orderId}
                    order={order}
                    waitlistSet={waitlistSet}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  )
}

function OrderRow({ order, waitlistSet, onClick }) {
  const anyLateWithFine = order.items.some((i) => {
    const hasReservation = waitlistSet.has(i.book_id)
    return computeRentalFine(i, hasReservation).isLate
  })

  const firstTitle = order.items[0]?.book?.title
  const extra = order.bookCount - 1

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full ficha flex items-center gap-4 text-left hover:bg-pergaminho-dark/20 transition-colors',
        anyLateWithFine && 'border-l-4 border-l-terracota',
      )}
    >
      {/* Capa do primeiro livro */}
      <div className="w-10 h-14 bg-pergaminho-darker flex-shrink-0 overflow-hidden">
        {order.items[0]?.book?.cover_url ? (
          <img src={order.items[0].book.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sepia/40">
            <BookOpen className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{order.user?.full_name}</span>
          {anyLateWithFine && (
            <span className="carimbo carimbo-terracota inline-flex items-center gap-1" style={{ transform: 'none' }}>
              <AlertTriangle className="w-3 h-3" /> Atrasado
            </span>
          )}
        </div>
        <div className="text-xs text-cafe/60 truncate">
          {firstTitle}{extra > 0 && ` + ${extra} livro${extra > 1 ? 's' : ''}`}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 text-xs text-cafe/60 flex-shrink-0">
        {order.deliveryMethod === 'delivery' ? (
          <><Truck className="w-3.5 h-3.5 text-sepia" /> Entrega</>
        ) : (
          <><Store className="w-3.5 h-3.5 text-sepia" /> Retirada</>
        )}
      </div>

      <div className="text-xs font-mono text-cafe/60 flex-shrink-0 hidden md:block">
        {formatDatador(order.rentedAt)}
      </div>

      <div className="text-right flex-shrink-0">
        <div className="font-mono text-sm">{formatMoney(order.totalPrice)}</div>
        <div className={cn('text-[10px]', order.allPaid ? 'text-musgo' : 'text-terracota')}>
          {order.allPaid ? 'pago' : 'pendente'}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-sepia flex-shrink-0" />
    </button>
  )
}
