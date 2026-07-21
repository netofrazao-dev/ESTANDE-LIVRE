import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, BookOpen, User, Mail, Phone, CircleDollarSign, Shield } from 'lucide-react'
import { useReaderStats, useReaderRentals, usePromoteToAdmin } from '@/hooks/useRentals'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { calculateFine, formatDatador, formatMoney, rentalStatusLabel, cn } from '@/lib/utils'
import FinePaymentModal from '@/components/admin/FinePaymentModal'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

function useReaderProfile(id) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export default function AdminReaderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: profile } = useReaderProfile(id)
  const { data: stats } = useReaderStats(id)
  const { data: rentals = [], isLoading } = useReaderRentals(id)
  const [paying, setPaying] = useState(null)
  const [confirmingAdmin, setConfirmingAdmin] = useState(false)
  const promoteToAdmin = usePromoteToAdmin()

  const handlePromote = async () => {
    try {
      await promoteToAdmin.mutateAsync(id)
      toast.success(`${profile?.full_name} agora é administrador.`)
      setConfirmingAdmin(false)
      navigate('/admin/leitores')
    } catch (err) {
      toast.error(err.message || 'Não foi possível promover.')
    }
  }

  return (
    <div>
      <Link
        to="/admin/leitores"
        className="inline-flex items-center gap-2 text-sm text-cafe/60 hover:text-cafe mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar aos leitores
      </Link>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 mb-10">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-sepia/10 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-sepia" />
          </div>
          <div>
            <h1 className="font-display text-display-md">{profile?.full_name || '—'}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-cafe/60">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {profile?.email}
              </span>
              {profile?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setConfirmingAdmin(true)} className="flex-shrink-0">
          <Shield className="w-3.5 h-3.5" /> Tornar administrador
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Stat label="Total de empréstimos" value={stats.total_rentals} />
          <Stat label="Em curso" value={stats.active_rentals} tone="musgo" />
          <Stat
            label="Taxa de atraso"
            value={`${stats.late_return_rate}%`}
            tone={stats.late_return_rate > 20 ? 'terracota' : 'sepia'}
          />
          <Stat
            label="Multas pendentes"
            value={formatMoney(stats.total_fines_pending)}
            tone={stats.total_fines_pending > 0 ? 'terracota' : 'sepia'}
            isMoney
          />
        </div>
      )}

      {stats && (stats.damaged_returns > 0 || stats.lost_returns > 0) && (
        <div className="ficha bg-terracota/5 border-terracota/20 mb-10 flex gap-6 text-sm">
          {stats.damaged_returns > 0 && (
            <div>
              <span className="font-mono text-terracota font-medium">{stats.damaged_returns}</span>
              {' '}devolução(ões) com dano
            </div>
          )}
          {stats.lost_returns > 0 && (
            <div>
              <span className="font-mono text-terracota font-medium">{stats.lost_returns}</span>
              {' '}extravio(s)
            </div>
          )}
        </div>
      )}

      {/* Histórico completo */}
      <h2 className="font-display text-xl mb-4">Histórico completo</h2>
      {isLoading ? (
        <div className="text-center py-10 text-sepia">Carregando…</div>
      ) : rentals.length === 0 ? (
        <div className="text-center py-10 text-sepia">Nenhum empréstimo registrado.</div>
      ) : (
        <div className="border border-sepia/15 bg-pergaminho divide-y divide-sepia/10">
          {rentals.map((r) => {
            const isActive = r.status === 'active'
            const fine = isActive ? calculateFine(r.due_date, new Date(), r.daily_fine_rate) : { amount: 0, isLate: false }
            const totalFee = isActive ? fine.amount : (r.late_fee || 0) + (r.damage_fee || 0)
            const owesDebt =
              !isActive &&
              ((r.late_fee > 0 && !r.late_fee_paid) || (r.damage_fee > 0 && !r.damage_fee_paid))

            return (
              <div key={r.id} className="flex items-center gap-4 px-4 py-3">
                <div className="w-9 h-12 bg-pergaminho-darker flex-shrink-0 overflow-hidden">
                  {r.book?.cover_url ? (
                    <img src={r.book.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sepia/40">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.book?.title}</div>
                  <div className="text-xs text-cafe/60 font-mono">
                    {formatDatador(r.rented_at)} → {formatDatador(r.due_date)}
                  </div>
                </div>
                <div className="text-xs">
                  {fine.isLate ? (
                    <span className="text-terracota font-medium">Atrasado</span>
                  ) : (
                    rentalStatusLabel(r.status)
                  )}
                </div>
                <div className={cn(
                  'text-sm font-mono tabular-nums w-20 text-right',
                  totalFee > 0 ? (owesDebt ? 'text-terracota' : 'text-musgo') : 'text-cafe/30',
                )}>
                  {formatMoney(totalFee)}
                </div>
                <div className="w-8 text-right">
                  {owesDebt && (
                    <button
                      onClick={() => setPaying(r)}
                      className="p-1.5 text-sepia hover:text-musgo transition-colors"
                      title="Registrar pagamento"
                    >
                      <CircleDollarSign className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {paying && <FinePaymentModal rental={paying} onClose={() => setPaying(null)} />}

      <Modal
        open={confirmingAdmin}
        onClose={() => setConfirmingAdmin(false)}
        title="Tornar administrador?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmingAdmin(false)}>Cancelar</Button>
            <Button onClick={handlePromote} loading={promoteToAdmin.isPending}>
              Confirmar
            </Button>
          </>
        }
      >
        <p className="text-sm text-cafe/80 text-pretty">
          <strong>{profile?.full_name}</strong> vai ganhar acesso completo ao backoffice —
          gestão de acervo, empréstimos, devoluções, outros leitores e configurações do
          sistema. Essa ação não tem um botão de "desfazer" na interface; se precisar reverter,
          será via SQL direto no banco.
        </p>
      </Modal>
    </div>
  )
}

function Stat({ label, value, tone = 'cafe', isMoney }) {
  const toneMap = {
    cafe: 'text-cafe',
    musgo: 'text-musgo',
    terracota: 'text-terracota',
    sepia: 'text-sepia',
  }
  return (
    <div className="ficha">
      <div className="eyebrow mb-2">{label}</div>
      <div className={cn('font-display tabular-nums', isMoney ? 'text-xl' : 'text-3xl', toneMap[tone])}>
        {value}
      </div>
    </div>
  )
}
