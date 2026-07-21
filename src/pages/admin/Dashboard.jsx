import { Link } from 'react-router-dom'
import { BookMarked, Library, AlertTriangle, TrendingUp, ArrowRight, CircleDollarSign, PlusCircle } from 'lucide-react'
import { useAdminStats, useAllRentals } from '@/hooks/useRentals'
import { formatDatador, calculateFine, formatMoney } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function AdminDashboard() {
  const { data: stats } = useAdminStats()
  const { data: activeRentals = [] } = useAllRentals({ status: 'active' })

  const lateRentals = activeRentals
    .filter((r) => new Date(r.due_date) < new Date())
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5)

  return (
    <div>
      <div className="mb-10">
        <div className="eyebrow mb-2">Painel administrativo</div>
        <h1 className="font-display text-display-md">Visão geral</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
        <StatCard
          icon={BookMarked}
          label="Títulos no acervo"
          value={stats?.totalBooks || 0}
        />
        <StatCard
          icon={Library}
          label="Empréstimos ativos"
          value={stats?.activeRentals || 0}
          tone="musgo"
        />
        <StatCard
          icon={AlertTriangle}
          label="Em atraso"
          value={stats?.lateRentals || 0}
          tone={stats?.lateRentals > 0 ? 'terracota' : 'sepia'}
        />
        <Link to="/admin/emprestimos">
          <StatCard
            icon={CircleDollarSign}
            label="Multas pendentes"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.pendingFines || 0)}
            tone={stats?.pendingFines > 0 ? 'terracota' : 'sepia'}
            small
          />
        </Link>
        <StatCard
          icon={TrendingUp}
          label="Total histórico"
          value={stats?.totalRentals || 0}
        />
      </div>

      {/* Empréstimos em atraso */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">Atrasos que precisam de atenção</h2>
          <Link
            to="/admin/emprestimos"
            className="text-xs text-sepia hover:text-cafe inline-flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {lateRentals.length === 0 ? (
          <div className="ficha text-center py-10">
            <div className="text-musgo font-display text-xl">Sem atrasos no momento</div>
            <p className="text-sm text-cafe/60 mt-1">Todos os livros estão dentro do prazo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lateRentals.map((r) => {
              const fine = calculateFine(r.due_date, new Date(), r.daily_fine_rate)
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-4 py-3 px-4 bg-terracota/5 border border-terracota/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{r.user?.full_name}</div>
                    <div className="text-xs text-cafe/60">
                      {r.book?.title} · vencia em {formatDatador(r.due_date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-sepia">{fine.daysLate} dia(s)</div>
                    <div className="font-mono text-sm text-terracota tabular-nums">
                      {formatMoney(fine.amount)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Ações rápidas */}
      <section>
        <h2 className="font-display text-xl mb-4">Ações rápidas</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <Link to="/admin/nova-locacao" className="ficha hover:bg-musgo/10 border-musgo/20 transition-colors group">
            <PlusCircle className="w-5 h-5 text-musgo mb-3" />
            <div className="font-display text-lg">Nova locação</div>
            <p className="text-xs text-cafe/60 mt-1">Registrar locação no balcão</p>
          </Link>
          <Link to="/admin/livros" className="ficha hover:bg-pergaminho-dark/30 transition-colors group">
            <BookMarked className="w-5 h-5 text-sepia mb-3 group-hover:text-musgo transition-colors" />
            <div className="font-display text-lg">Catalogar novo livro</div>
            <p className="text-xs text-cafe/60 mt-1">Adicionar título ao acervo</p>
          </Link>
          <Link to="/admin/devolucoes" className="ficha hover:bg-pergaminho-dark/30 transition-colors group">
            <Library className="w-5 h-5 text-sepia mb-3 group-hover:text-musgo transition-colors" />
            <div className="font-display text-lg">Registrar devolução</div>
            <p className="text-xs text-cafe/60 mt-1">Confirmar chegada e avaliar</p>
          </Link>
          <Link to="/admin/emprestimos" className="ficha hover:bg-pergaminho-dark/30 transition-colors group">
            <AlertTriangle className="w-5 h-5 text-sepia mb-3 group-hover:text-musgo transition-colors" />
            <div className="font-display text-lg">Consultar empréstimos</div>
            <p className="text-xs text-cafe/60 mt-1">Ver quem está com o quê</p>
          </Link>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone = 'cafe', small }) {
  const toneMap = {
    cafe: 'text-cafe',
    musgo: 'text-musgo',
    terracota: 'text-terracota',
    sepia: 'text-sepia',
  }
  return (
    <div className="ficha h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="eyebrow">{label}</span>
        <Icon className={cn('w-4 h-4 opacity-60', toneMap[tone])} />
      </div>
      <div className={cn('font-display tabular-nums', small ? 'text-xl' : 'text-3xl', toneMap[tone])}>
        {value}
      </div>
    </div>
  )
}
