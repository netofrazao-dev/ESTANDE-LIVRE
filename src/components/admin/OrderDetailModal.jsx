import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Truck, Store, BookOpen, User, Mail, Phone, MapPin, Calendar,
  CircleDollarSign, PackageCheck, AlertTriangle, Check, X,
} from 'lucide-react'
import { useMarkOrderPaid, useSetOrderDelivered } from '@/hooks/useRentals'
import { useBooksWithActiveWaitlist } from '@/hooks/usePricing'
import { computeRentalFine, formatDatador, formatMoney, rentalStatusLabel, cn } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

export default function OrderDetailModal({ order, onClose }) {
  const [method, setMethod] = useState('cash')
  const markPaid = useMarkOrderPaid()
  const setDelivered = useSetOrderDelivered()
  const { data: waitlistSet = new Set() } = useBooksWithActiveWaitlist()

  const rentalIds = order.items.map((i) => i.id)

  const handleMarkPaid = async () => {
    try {
      await markPaid.mutateAsync({ rentalIds, method })
      toast.success('Pedido marcado como pago.')
    } catch (err) {
      toast.error(err.message || 'Erro ao registrar pagamento.')
    }
  }

  const handleToggleDelivered = async () => {
    try {
      await setDelivered.mutateAsync({ rentalIds, delivered: !order.allDelivered })
      toast.success(order.allDelivered ? 'Marcado como pendente.' : 'Pedido marcado como entregue/retirado.')
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar.')
    }
  }

  return (
    <Modal open onClose={onClose} title="Detalhe do pedido" size="lg">
      <div className="space-y-6 -mt-2">
        {/* Leitor */}
        <div className="ficha bg-pergaminho-dark/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 font-medium text-sm mb-1">
                <User className="w-3.5 h-3.5 text-sepia" /> {order.user?.full_name}
              </div>
              <div className="flex flex-col gap-0.5 text-xs text-cafe/60">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> {order.user?.email}
                </span>
                {order.user?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> {order.user.phone}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-xs text-cafe/60 flex-shrink-0">
              <div className="flex items-center gap-1.5 justify-end">
                <Calendar className="w-3 h-3" /> {formatDatador(order.rentedAt)}
              </div>
              {order.isCombo && <div className="text-musgo mt-1">Pedido combo</div>}
            </div>
          </div>
        </div>

        {/* Entrega */}
        <div className="ficha">
          <div className="eyebrow mb-2">
            {order.deliveryMethod === 'delivery' ? 'Entrega' : 'Retirada'}
          </div>
          <div className="flex items-center gap-2 text-sm">
            {order.deliveryMethod === 'delivery' ? (
              <Truck className="w-4 h-4 text-sepia flex-shrink-0" />
            ) : (
              <Store className="w-4 h-4 text-sepia flex-shrink-0" />
            )}
            <span>{order.deliveryMethod === 'delivery' ? 'Entrega no endereço abaixo' : 'Retirada na loja'}</span>
          </div>
          {order.deliveryMethod === 'delivery' && (
            <div className="flex items-start gap-2 mt-2 text-sm text-cafe/80">
              <MapPin className="w-4 h-4 text-sepia flex-shrink-0 mt-0.5" />
              <span>{order.deliveryAddress || 'Endereço não informado'}</span>
            </div>
          )}
        </div>

        {/* Livros */}
        <div>
          <div className="eyebrow mb-3">Livros ({order.bookCount})</div>
          <div className="space-y-2">
            {order.items.map((item) => {
              const hasReservation = waitlistSet.has(item.book_id)
              const fine = computeRentalFine(item, hasReservation)
              return (
                <div key={item.id} className="flex gap-3 p-3 border border-sepia/15 bg-pergaminho">
                  <div className="w-9 h-12 bg-pergaminho-darker flex-shrink-0 overflow-hidden">
                    {item.book?.cover_url ? (
                      <img src={item.book.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sepia/40">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium truncate">{item.book?.title}</div>
                      <span className={cn(
                        'text-[10px] font-mono flex-shrink-0',
                        fine.isLate ? 'text-terracota font-semibold' : 'text-cafe/50',
                      )}>
                        {fine.isLate ? 'atrasado' : rentalStatusLabel(item.status)}
                      </span>
                    </div>
                    <div className="text-[11px] text-cafe/60 mt-0.5">
                      {item.rental_days}d · {formatMoney(item.price)}
                      {item.renewal_days > 0 && (
                        <span> · renovação disp.: {item.renewal_days}d</span>
                      )}
                      {item.renewals_count > 0 && <span className="text-sepia"> · já renovado</span>}
                    </div>
                    {fine.isLate && (
                      <div className="text-[11px] text-terracota flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3" /> Multa acumulada: {formatMoney(fine.amount)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Total */}
        <div className="rule-double" />
        <div className="flex justify-between items-center">
          <span className="font-medium text-sm">Total do pedido</span>
          <span className="font-mono text-lg text-musgo">{formatMoney(order.totalPrice)}</span>
        </div>

        {/* Ações: pagamento e entrega */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Pagamento */}
          <div className={cn('ficha', order.allPaid ? 'bg-musgo/5 border-musgo/20' : 'bg-terracota/5 border-terracota/20')}>
            <div className="flex items-center gap-2 mb-2">
              <CircleDollarSign className={cn('w-4 h-4', order.allPaid ? 'text-musgo' : 'text-terracota')} />
              <span className="eyebrow">Pagamento</span>
            </div>
            {order.allPaid ? (
              <div className="flex items-center gap-1.5 text-sm text-musgo">
                <Check className="w-4 h-4" /> Pago
              </div>
            ) : (
              <>
                <p className="text-xs text-cafe/70 mb-3">Ainda não confirmado.</p>
                <div className="flex gap-2 mb-3">
                  {['cash', 'pix', 'card'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={cn(
                        'px-2.5 py-1 text-[11px] border transition-colors',
                        method === m ? 'bg-cafe text-pergaminho border-cafe' : 'border-sepia/30 text-cafe/70',
                      )}
                    >
                      {m === 'cash' ? 'Dinheiro' : m === 'pix' ? 'PIX' : 'Cartão'}
                    </button>
                  ))}
                </div>
                <Button size="sm" onClick={handleMarkPaid} loading={markPaid.isPending} className="w-full">
                  Marcar como pago
                </Button>
              </>
            )}
          </div>

          {/* Entrega/retirada */}
          <div className={cn('ficha', order.allDelivered ? 'bg-musgo/5 border-musgo/20' : 'bg-pergaminho-dark/30')}>
            <div className="flex items-center gap-2 mb-2">
              <PackageCheck className={cn('w-4 h-4', order.allDelivered ? 'text-musgo' : 'text-sepia')} />
              <span className="eyebrow">{order.deliveryMethod === 'delivery' ? 'Entrega' : 'Retirada'}</span>
            </div>
            {order.allDelivered ? (
              <div className="flex items-center gap-1.5 text-sm text-musgo mb-3">
                <Check className="w-4 h-4" /> Já entregue/retirado
              </div>
            ) : (
              <p className="text-xs text-cafe/70 mb-3">Ainda aguardando o leitor.</p>
            )}
            <Button
              size="sm"
              variant={order.allDelivered ? 'secondary' : 'primary'}
              onClick={handleToggleDelivered}
              loading={setDelivered.isPending}
              className="w-full"
            >
              {order.allDelivered ? (
                <><X className="w-3.5 h-3.5" /> Desfazer</>
              ) : (
                <><PackageCheck className="w-3.5 h-3.5" /> Marcar como entregue</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
