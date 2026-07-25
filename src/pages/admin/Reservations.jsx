import { useMemo } from 'react'
import { BookOpen, Clock3, Bell, Mail, Phone } from 'lucide-react'
import { useAllActiveReservations } from '@/hooks/useReservations'
import { formatDatador, cn } from '@/lib/utils'

export default function AdminReservations() {
  const { data: reservations = [], isLoading } = useAllActiveReservations()

  // Agrupa por livro — cada grupo já vem ordenado por created_at (o
  // primeiro do array é o primeiro da fila).
  const groups = useMemo(() => {
    const map = new Map()
    for (const r of reservations) {
      if (!map.has(r.book_id)) {
        map.set(r.book_id, { book: r.book, items: [] })
      }
      map.get(r.book_id).items.push(r)
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length)
  }, [reservations])

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow mb-2">Fila de espera</div>
        <h1 className="font-display text-display-md">Reservas</h1>
        <p className="text-sm text-cafe/70 mt-2 text-pretty">
          Livros esgotados com gente esperando — em ordem de chegada. Quando alguém devolve, o
          primeiro da fila é avisado automaticamente e tem 48h para retirar.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-sepia">Carregando…</div>
      ) : groups.length === 0 ? (
        <div className="ficha text-center py-16">
          <Clock3 className="w-10 h-10 text-sepia mx-auto mb-4" />
          <div className="font-display text-xl">Nenhuma fila no momento</div>
          <p className="text-sm text-cafe/60 mt-1">
            Quando um livro esgotar e alguém reservar, aparece aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ book, items }) => (
            <div key={book.id} className="ficha">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-sepia/15">
                <div className="w-10 h-14 bg-pergaminho-darker flex-shrink-0 overflow-hidden">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sepia/40">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg truncate">{book.title}</div>
                  <div className="text-xs text-cafe/60">{book.author}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-mono text-lg text-terracota">{items.length}</div>
                  <div className="text-[10px] text-sepia">
                    na fila{book.available_copies > 0 && ' · liberou cópia'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {items.map((res, i) => (
                  <div
                    key={res.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 border',
                      res.status === 'notified'
                        ? 'bg-musgo/10 border-musgo/30'
                        : 'border-sepia/10 bg-pergaminho-dark/10',
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-cafe text-pergaminho flex items-center justify-center text-[11px] font-mono flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{res.user?.full_name}</div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-cafe/60">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {res.user?.email}
                        </span>
                        {res.user?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {res.user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {res.status === 'notified' ? (
                        <div className="flex items-center gap-1 text-xs text-musgo font-medium">
                          <Bell className="w-3.5 h-3.5" /> Avisado — até {formatDatador(res.expires_at)}
                        </div>
                      ) : (
                        <div className="text-[11px] text-sepia">
                          esperando desde {formatDatador(res.created_at)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
