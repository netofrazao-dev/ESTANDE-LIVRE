import { useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle, AlertCircle, ShieldAlert, X, BookOpen } from 'lucide-react'
import { useAllRentals, useReturnBook } from '@/hooks/useRentals'
import { useBooksWithActiveWaitlist } from '@/hooks/usePricing'
import { useSettingsStore } from '@/stores/settingsStore'
import { computeRentalFine, formatDatador, formatMoney, cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

export default function AdminReturns() {
  const { data: rentals = [], isLoading } = useAllRentals({ status: 'active' })
  const { data: waitlistSet = new Set() } = useBooksWithActiveWaitlist()
  const [returning, setReturning] = useState(null)

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow mb-2">Retorno de livros</div>
        <h1 className="font-display text-display-md">Auditoria de devoluções</h1>
        <p className="text-sm text-cafe/70 mt-2">
          Confirme a chegada e registre eventuais danos ou perdas.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-sepia">Carregando…</div>
      ) : rentals.length === 0 ? (
        <div className="ficha text-center py-16">
          <CheckCircle className="w-10 h-10 text-musgo mx-auto mb-4" />
          <div className="font-display text-xl">Nenhum livro em curso</div>
          <p className="text-sm text-cafe/60 mt-1">Todos os empréstimos ativos aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rentals.map((rental) => {
            const hasReservation = waitlistSet.has(rental.book_id)
            const fine = computeRentalFine(rental, hasReservation)
            return (
              <div
                key={rental.id}
                className={cn(
                  'ficha p-5 flex gap-5 items-center',
                  fine.isLate && 'border-l-4 border-l-terracota',
                )}
              >
                <div className="w-12 h-16 bg-pergaminho-darker flex-shrink-0 overflow-hidden">
                  {rental.book?.cover_url ? (
                    <img src={rental.book.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sepia/40">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium">{rental.book?.title}</div>
                  <div className="text-xs text-cafe/60 mb-2">
                    com <strong>{rental.user?.full_name}</strong>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] font-mono text-sepia">
                    <span>Retirou {formatDatador(rental.rented_at)}</span>
                    <span className={fine.isLate ? 'text-terracota font-semibold' : ''}>
                      Vencia {formatDatador(rental.due_date)}
                    </span>
                    {fine.isLate && (
                      <span className="text-terracota font-semibold">
                        Multa acumulada: {formatMoney(fine.amount)} ({fine.daysLate}d)
                        {hasReservation && ' · taxa de reservado'}
                      </span>
                    )}
                  </div>
                </div>

                <Button onClick={() => setReturning(rental)}>
                  Registrar devolução
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {returning && (
        <ReturnModal
          rental={returning}
          hasReservation={waitlistSet.has(returning.book_id)}
          onClose={() => setReturning(null)}
        />
      )}
    </div>
  )
}

// ── Modal de devolução ───────────────────────────────────────────
function ReturnModal({ rental, hasReservation, onClose }) {
  const [condition, setCondition] = useState('ok')
  const [notes, setNotes] = useState('')
  const returnBook = useReturnBook()
  const { minorDamageFee, lostAdminFee } = useSettingsStore()

  const fine = computeRentalFine(rental, hasReservation)
  const replacementValue = rental.book?.replacement_value || 0

  const feeMap = {
    ok: 0,
    minor_cover: minorDamageFee,
    torn_cover: replacementValue + lostAdminFee,
    lost: replacementValue + lostAdminFee,
  }
  const fee = feeMap[condition]
  const total = fine.amount + fee

  const handleConfirm = async () => {
    try {
      await returnBook.mutateAsync({ rentalId: rental.id, condition, notes })
      toast.success('Devolução registrada.')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Erro ao registrar.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar devolução"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} loading={returnBook.isPending}>
            Confirmar devolução
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="ficha bg-pergaminho-dark/30">
          <div className="eyebrow mb-1">Livro</div>
          <div className="font-medium">{rental.book?.title}</div>
          <div className="text-xs text-cafe/60">Leitor: {rental.user?.full_name}</div>
          {hasReservation && (
            <div className="text-xs text-terracota mt-1">
              Há leitor(es) na fila de espera — multa de atraso usa a taxa "reservado".
            </div>
          )}
        </div>

        <div>
          <div className="eyebrow mb-3">Condição do livro na devolução</div>
          <div className="space-y-2">
            <ConditionOption
              value="ok"
              current={condition}
              onSelect={setCondition}
              icon={CheckCircle}
              label="Em bom estado"
              description="Livro devolvido íntegro. Volta ao acervo."
              tone="musgo"
            />
            <ConditionOption
              value="minor_cover"
              current={condition}
              onSelect={setCondition}
              icon={AlertCircle}
              label="Dano leve na capa"
              description={`Amassado ou rasgo pequeno. Taxa fixa de ${formatMoney(minorDamageFee)}. Volta ao acervo.`}
              tone="terracota"
            />
            <ConditionOption
              value="torn_cover"
              current={condition}
              onSelect={setCondition}
              icon={ShieldAlert}
              label="Capa arrancada"
              description={
                replacementValue > 0
                  ? `Livro novo (${formatMoney(replacementValue)}) + taxa de ${formatMoney(lostAdminFee)}. Sai do acervo.`
                  : `Cadastre o valor de reposição deste livro em Acervo — usando apenas a taxa de ${formatMoney(lostAdminFee)} por enquanto.`
              }
              tone="terracota"
            />
            <ConditionOption
              value="lost"
              current={condition}
              onSelect={setCondition}
              icon={X}
              label="Extraviado / sem condições de uso"
              description={
                replacementValue > 0
                  ? `Livro novo (${formatMoney(replacementValue)}) + taxa de ${formatMoney(lostAdminFee)}. Sai do acervo.`
                  : `Cadastre o valor de reposição deste livro em Acervo — usando apenas a taxa de ${formatMoney(lostAdminFee)} por enquanto.`
              }
              tone="terracota"
            />
          </div>
        </div>

        {condition !== 'ok' && (
          <div>
            <label className="eyebrow block mb-2">Observações (opcional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o dano observado…"
              className="input-boxed resize-none"
            />
          </div>
        )}

        {total > 0 && (
          <div className="ficha bg-terracota/5 border-terracota/20">
            <div className="eyebrow text-terracota mb-3">Total a cobrar do leitor</div>
            <dl className="space-y-1 text-sm">
              {fine.amount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-cafe/70">
                    Multa por atraso ({fine.daysLate}d{hasReservation ? ' · reservado' : ''})
                  </dt>
                  <dd className="font-mono tabular-nums">{formatMoney(fine.amount)}</dd>
                </div>
              )}
              {fee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-cafe/70">
                    {condition === 'minor_cover' ? 'Taxa de reparo' : 'Reposição + taxa administrativa'}
                  </dt>
                  <dd className="font-mono tabular-nums">{formatMoney(fee)}</dd>
                </div>
              )}
              <div className="rule-double my-2" />
              <div className="flex justify-between font-medium">
                <dt>Total</dt>
                <dd className="font-mono tabular-nums text-terracota">{formatMoney(total)}</dd>
              </div>
            </dl>
            {condition !== 'ok' && (
              <p className="text-[11px] text-sepia mt-3 text-pretty">
                Se a multa continuar em aberto, ela segue contando dia a dia até você registrar o
                pagamento em Empréstimos ou no perfil do leitor.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function ConditionOption({ value, current, onSelect, icon: Icon, label, description, tone }) {
  const active = current === value
  const toneMap = {
    musgo: 'border-musgo bg-musgo/5',
    terracota: 'border-terracota bg-terracota/5',
  }
  return (
    <button
      onClick={() => onSelect(value)}
      className={cn(
        'w-full flex items-start gap-3 p-4 border-2 text-left transition-colors',
        active ? toneMap[tone] : 'border-sepia/20 hover:border-sepia',
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', tone === 'musgo' ? 'text-musgo' : 'text-terracota')} />
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-cafe/60 mt-0.5">{description}</div>
      </div>
    </button>
  )
}
