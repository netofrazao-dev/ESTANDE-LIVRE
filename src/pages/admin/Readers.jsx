import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronRight, User } from 'lucide-react'
import { useReaders } from '@/hooks/useRentals'

export default function AdminReaders() {
  const [search, setSearch] = useState('')
  const { data: readers = [], isLoading } = useReaders(search)

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow mb-2">Cadastro</div>
        <h1 className="font-display text-display-md">Leitores</h1>
        <p className="text-sm text-cafe/70 mt-2">
          {readers.length} leitor{readers.length === 1 ? '' : 'es'} cadastrado{readers.length === 1 ? '' : 's'}.
        </p>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sepia" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          className="input-boxed pl-10"
        />
      </div>

      <div className="border border-sepia/15 bg-pergaminho divide-y divide-sepia/10">
        {isLoading ? (
          <div className="text-center py-10 text-sepia">Carregando…</div>
        ) : readers.length === 0 ? (
          <div className="text-center py-10 text-sepia">Nenhum leitor encontrado.</div>
        ) : (
          readers.map((reader) => (
            <Link
              key={reader.id}
              to={`/admin/leitores/${reader.id}`}
              className="flex items-center gap-4 px-4 py-4 hover:bg-pergaminho-dark/20 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-sepia/10 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-sepia" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{reader.full_name}</div>
                <div className="text-xs text-cafe/60">{reader.email}</div>
              </div>
              {reader.phone && (
                <div className="text-xs text-cafe/60 font-mono hidden md:block">{reader.phone}</div>
              )}
              <ChevronRight className="w-4 h-4 text-sepia" />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
