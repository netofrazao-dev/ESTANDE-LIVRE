import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRegisterPayment } from '@/hooks/useRentals'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { formatMoney } from '@/lib/utils'

const methods = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'card', label: 'Cartão' },
]

export default function FinePaymentModal({ rental, onClose }) {
  const registerPayment = useRegisterPayment()
  const [payLate, setPayLate] = useState((rental.late_fee || 0) > 0 && !rental.late_fee_paid)
  const [payDamage, setPayDamage] = useState((rental.damage_fee || 0) > 0 && !rental.damage_fee_paid)
  const [method, setMethod] = useState('cash')
  const [notes, setNotes] = useState('')

  const total =
    (payLate ? rental.late_fee || 0 : 0) + (payDamage ? rental.damage_fee || 0 : 0)

  const handleConfirm = async () => {
    if (!payLate && !payDamage) {
      toast.error('Selecione ao menos um item para dar baixa.')
      return
    }
    try {
      await registerPayment.mutateAsync({
        rentalId: rental.id,
        payLate,
        payDamage,
        method,
        notes,
      })
      toast.success('Pagamento registrado.')
      onClose()
    } catch (err) {
      toast.error(err.message || 'Erro ao registrar pagamento.')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar pagamento"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} loading={registerPayment.isPending}>
            Confirmar recebimento
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="ficha bg-pergaminho-dark/30">
          <div className="eyebrow mb-1">Livro</div>
          <div className="font-medium">{rental.book?.title}</div>
          <div className="text-xs text-cafe/60">Leitor: {rental.user?.full_name}</div>
        </div>

        <div className="space-y-2">
          {(rental.late_fee || 0) > 0 && (
            <label className="flex items-center justify-between gap-3 p-3 border border-sepia/20 cursor-pointer">
              <span className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={payLate}
                  disabled={rental.late_fee_paid}
                  onChange={(e) => setPayLate(e.target.checked)}
                  className="w-4 h-4 accent-musgo"
                />
                Multa por atraso
                {rental.late_fee_paid && <span className="text-[10px] text-musgo">(já paga)</span>}
              </span>
              <span className="font-mono tabular-nums">{formatMoney(rental.late_fee)}</span>
            </label>
          )}
          {(rental.damage_fee || 0) > 0 && (
            <label className="flex items-center justify-between gap-3 p-3 border border-sepia/20 cursor-pointer">
              <span className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={payDamage}
                  disabled={rental.damage_fee_paid}
                  onChange={(e) => setPayDamage(e.target.checked)}
                  className="w-4 h-4 accent-musgo"
                />
                Taxa de dano/reposição
                {rental.damage_fee_paid && <span className="text-[10px] text-musgo">(já paga)</span>}
              </span>
              <span className="font-mono tabular-nums">{formatMoney(rental.damage_fee)}</span>
            </label>
          )}
        </div>

        <div>
          <label className="eyebrow block mb-2">Forma de pagamento</label>
          <div className="flex gap-2">
            {methods.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                  method === m.value
                    ? 'bg-cafe text-pergaminho border-cafe'
                    : 'border-sepia/30 text-cafe/70 hover:border-cafe'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="eyebrow block mb-2">Observações (opcional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-boxed resize-none"
          />
        </div>

        <div className="rule-double" />
        <div className="flex justify-between items-center font-medium">
          <span>Total a receber</span>
          <span className="font-mono text-lg text-musgo tabular-nums">{formatMoney(total)}</span>
        </div>
      </div>
    </Modal>
  )
}
