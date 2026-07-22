import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Clock,
  RotateCw,
  Bell,
  X,
  Truck,
  Store,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useMyRentals, useRenewRental } from '@/hooks/useRentals'
import { useMyReservations, useCancelReservation } from '@/hooks/useReservations'
import { useBooksWithActiveWaitlist } from '@/hooks/usePricing'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import {
  computeRentalFine,
  daysUntilDue,
  formatDatador,
  formatMoney,
  rentalStatusLabel,
  cn,
} from '@/lib/utils'

export default function MyRentals() {
  const user = useAuthStore((s) => s.user)
  const { data: rentals = [], isLoading } = useMyRentals(user?.id)
  const { data: reservations = [] } = useMyReservations(user?.id)
  const { data: waitlistSet = new Set() } = useBooksWithActiveWaitlist()
  const [, setTick] = useState(0)

  // Atualiza a cada minuto para o cálculo dinâmico das multas
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const active = rentals.filter((r) => r.status === 'active')
  const history = rentals.filter((r) => r.status !== 'active')

  const enriched = active.map((r) => {
    const hasReservation = waitlistSet.has(r.book_id)
    const fine = computeRentalFine(r, hasReservation)
    const days = daysUntilDue(r.due_date)
    return { ...r, fine, days, isLate: fine.isLate, hasReservation }
  })

  const totalPendingFine = enriched.reduce((sum, r) => sum + r.fine.amount, 0)

  if (isLoading) {
    return (
      <div className="container-book py-20 text-center text-sepia">Carregando…</div>
    )
  }

  return (
    <div className="container-book py-12 md:py-16">
      <div className="mb-10">
        <div className="eyebrow mb-2">Área do leitor</div>
        <h1 className="font-display text-display-lg">Minha estante</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <KpiCard
          icon={BookOpen}
          label="Em curso"
          value={enriched.filter((r) => !r.isLate).length}
          tone="musgo"
        />
        <KpiCard
          icon={Clock}
          label="Atrasados"
          value={enriched.filter((r) => r.isLate).length}
          tone={enriched.some((r) => r.isLate) ? 'terracota' : 'sepia'}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Multa acumulada"
          value={formatMoney(totalPendingFine)}
          tone={totalPendingFine > 0 ? 'terracota' : 'sepia'}
          isMoney
        />
        <KpiCard
          icon={CheckCircle}
          label="Devolvidos"
          value={history.length}
          tone="sepia"
        />
      </div>

      {/* Reservas na fila */}
      {reservations.length > 0 && (
        <section className="mb-16">
          <h2 className="font-display text-display-sm mb-6">Minhas reservas</h2>
          <div className="space-y-3">
            {reservations.map((res) => (
              <ReservationRow key={res.id} reservation={res} />
            ))}
          </div>
        </section>
      )}

      {/* Aluguéis ativos */}
      <section className="mb-16">
        <h2 className="font-display text-display-sm mb-6">Em curso</h2>

        {enriched.length === 0 ? (
          <EmptyState
            title="Nenhum livro em curso"
            description="Passe pelo acervo e escolha algo para levar hoje."
            action={
              <Link to="/acervo" className="text-musgo underline underline-offset-4">
                Explorar acervo
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {enriched.map((rental) => (
              <RentalCard key={rental.id} rental={rental} />
            ))}
          </div>
        )}
      </section>

      {/* Histórico */}
      {history.length > 0 && (
        <section>
          <h2 className="font-display text-display-sm mb-6">Histórico</h2>
          <div className="space-y-4">
            {history.map((rental) => (
              <HistoryRow key={rental.id} rental={rental} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Componentes internos ─────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, tone = 'sepia', isMoney }) {
  const toneMap = {
    musgo: 'text-musgo',
    terracota: 'text-terracota',
    sepia: 'text-cafe',
  }
  return (
    <div className="ficha">
      <div className="flex items-start justify-between mb-3">
        <div className="eyebrow">{label}</div>
        <Icon className={cn('w-4 h-4', toneMap[tone], 'opacity-60')} />
      </div>
      <div className={cn(
        'font-display tabular-nums',
        isMoney ? 'text-xl' : 'text-3xl',
        toneMap[tone],
      )}>
        {value}
      </div>
    </div>
  )
}

function ReservationRow({ reservation }) {
  const { book } = reservation
  const cancelReservation = useCancelReservation()
  const isNotified = reservation.status === 'notified'

  const handleCancel = async () => {
    try {
      await cancelReservation.mutateAsync(reservation.id)
      toast.success('Reserva cancelada.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível cancelar.')
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 py-3 px-4 border',
        isNotified ? 'bg-musgo/10 border-musgo/30' : 'bg-pergaminho-dark/20 border-sepia/10',
      )}
    >
      <div className="w-10 h-14 bg-pergaminho-darker flex-shrink-0 overflow-hidden">
        {book?.cover_url ? (
          <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sepia/40">
            <BookOpen className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link to={`/livro/${book?.slug}`} className="font-medium text-sm hover:text-musgo transition-colors">
          {book?.title}
        </Link>
        <div className={cn('text-xs mt-0.5 flex items-center gap-1.5', isNotified ? 'text-musgo font-medium' : 'text-cafe/60')}>
          {isNotified ? (
            <>
              <Bell className="w-3 h-3" />
              Disponível! Retire até {formatDatador(reservation.expires_at)}
            </>
          ) : (
            'Aguardando na fila'
          )}
        </div>
      </div>
      <button
        onClick={handleCancel}
        className="p-2 text-sepia hover:text-terracota transition-colors flex-shrink-0"
        title="Cancelar reserva"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function RentalCard({ rental }) {
  const { book, days, isLate, fine, hasReservation } = rental
  const renewRental = useRenewRental()

  const canRenew = !isLate && (rental.renewals_count || 0) < (rental.max_renewals ?? 1)

  const handleRenew = async () => {
    try {
      await renewRental.mutateAsync({ rentalId: rental.id })
      toast.success('Empréstimo renovado! Novo prazo definido.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível renovar.')
    }
  }

  return (
    <article
      className={cn(
        'ficha p-6 border-l-4 transition-colors',
        isLate ? 'border-l-terracota bg-terracota/5' : 'border-l-musgo',
      )}
    >
      <div className="flex gap-6">
        <Link
          to={`/livro/${book?.slug}`}
          className="w-20 h-28 bg-pergaminho-darker flex-shrink-0 overflow-hidden shadow-book"
        >
          {book?.cover_url ? (
            <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sepia/40">
              <BookOpen className="w-6 h-6" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <Link
                to={`/livro/${book?.slug}`}
                className="font-display text-xl leading-tight hover:text-musgo transition-colors"
              >
                {book?.title}
              </Link>
              <p className="text-sm text-cafe/60 mt-1">{book?.author}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-cafe/60">
                <span className="flex items-center gap-1">
                  {rental.delivery_method === 'delivery' ? (
                    <><Truck className="w-3 h-3" /> Entrega</>
                  ) : (
                    <><Store className="w-3 h-3" /> Retirada na loja</>
                  )}
                </span>
                <span className="font-mono">{formatMoney(rental.price)}</span>
                <span className={rental.rental_paid ? 'text-musgo' : 'text-terracota'}>
                  {rental.rental_paid ? 'pago' : 'a combinar'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {rental.renewals_count > 0 && (
                <span className="text-[10px] font-mono text-sepia">renovado</span>
              )}
              {isLate && <span className="carimbo carimbo-terracota">Atrasado</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-sepia/15">
            <div>
              <div className="eyebrow mb-1">Retirado</div>
              <div className="font-mono text-xs tabular-nums">
                {formatDatador(rental.rented_at)}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Devolver até</div>
              <div className={cn(
                'font-mono text-xs tabular-nums',
                isLate && 'text-terracota font-semibold',
              )}>
                {formatDatador(rental.due_date)}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">
                {isLate ? 'Dias em atraso' : 'Dias restantes'}
              </div>
              <div className={cn(
                'font-mono text-lg tabular-nums font-medium',
                isLate ? 'text-terracota' : days <= 3 ? 'text-terracota' : 'text-musgo',
              )}>
                {isLate ? `+${fine.daysLate}` : days}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Multa</div>
              <div className={cn(
                'font-mono text-lg tabular-nums font-medium',
                fine.amount > 0 ? 'text-terracota' : 'text-cafe/40',
              )}>
                {formatMoney(fine.amount)}
              </div>
            </div>
          </div>

          {isLate ? (
            <div className="mt-4 pt-4 border-t border-terracota/20 flex items-center gap-2 text-sm text-terracota">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                A multa cresce {formatMoney(hasReservation ? rental.daily_fine_reserved : rental.daily_fine_normal)}
                {' '}por dia{hasReservation ? ' (há fila de espera por este título)' : ''}.
                Devolva o mais rápido possível.
              </span>
            </div>
          ) : canRenew ? (
            <div className="mt-4 pt-4 border-t border-sepia/15 flex items-center justify-between gap-3">
              <span className="text-xs text-cafe/60">
                Ainda precisa de mais tempo? Renove uma vez, sem sair de casa.
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRenew}
                loading={renewRental.isPending}
                className="flex-shrink-0"
              >
                <RotateCw className="w-3.5 h-3.5" /> Renovar
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

const damageTypeLabel = {
  minor_cover: 'dano leve na capa',
  torn_cover: 'capa arrancada',
  lost: 'extraviado',
}

function HistoryRow({ rental }) {
  const wasDamaged = rental.status === 'damaged'
  const wasLost = rental.status === 'lost'
  const owesRental = rental.price > 0 && !rental.rental_paid
  const owesLate = rental.late_fee > 0 && !rental.late_fee_paid
  const owesDamage = rental.damage_fee > 0 && !rental.damage_fee_paid
  const totalFee = (rental.price || 0) + (rental.late_fee || 0) + (rental.damage_fee || 0)
  const owesAnything = owesRental || owesLate || owesDamage

  return (
    <div className="flex items-center gap-4 py-3 px-4 bg-pergaminho-dark/20 border border-sepia/10">
      <div className="w-10 h-14 bg-pergaminho-darker flex-shrink-0 overflow-hidden">
        {rental.book?.cover_url ? (
          <img src={rental.book.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sepia/40">
            <BookOpen className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{rental.book?.title}</div>
        <div className="text-xs text-cafe/60">{rental.book?.author}</div>
      </div>
      <div className="text-right">
        <div className={cn('text-xs font-medium', (wasDamaged || wasLost) && 'text-terracota')}>
          {rentalStatusLabel(rental.status)}
          {rental.damage_type && ` · ${damageTypeLabel[rental.damage_type] || rental.damage_type}`}
        </div>
        <div className="text-[10px] text-sepia font-mono">
          {formatDatador(rental.returned_at)}
        </div>
      </div>
      {totalFee > 0 && (
        <div className="text-right border-l border-sepia/15 pl-4">
          <div className="text-[10px] text-sepia">
            {owesAnything ? 'Em aberto' : 'Quitado'}
          </div>
          <div className={cn(
            'text-sm font-mono tabular-nums',
            owesAnything ? 'text-terracota' : 'text-musgo',
          )}>
            {formatMoney(totalFee)}
          </div>
        </div>
      )}
    </div>
  )
}
