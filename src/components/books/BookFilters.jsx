import { Search, X } from 'lucide-react'
import { useCategories } from '@/hooks/useBooks'
import { cn } from '@/lib/utils'

export default function BookFilters({
  search,
  setSearch,
  category,
  setCategory,
  sort,
  setSort,
}) {
  const { data: categories = [] } = useCategories()

  const hasFilters = search || category

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
        {/* Busca */}
        <div className="flex-1">
          <label className="eyebrow block mb-2">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sepia" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Título ou autor…"
              className="input-boxed pl-10 pr-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sepia hover:text-cafe"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Ordenação */}
        <div>
          <label className="eyebrow block mb-2">Ordenar</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-boxed pr-8"
          >
            <option value="newest">Mais recentes</option>
            <option value="title">Título · A–Z</option>
            <option value="author">Autor · A–Z</option>
          </select>
        </div>
      </div>

      {/* Categorias */}
      {categories.length > 0 && (
        <div>
          <div className="eyebrow mb-3">Categorias</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory('')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium border transition-colors',
                !category
                  ? 'bg-cafe text-pergaminho border-cafe'
                  : 'border-sepia/30 text-cafe/70 hover:border-cafe hover:text-cafe',
              )}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.slug)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium border transition-colors',
                  category === c.slug
                    ? 'bg-cafe text-pergaminho border-cafe'
                    : 'border-sepia/30 text-cafe/70 hover:border-cafe hover:text-cafe',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasFilters && (
        <div className="pt-2">
          <button
            onClick={() => {
              setSearch('')
              setCategory('')
            }}
            className="text-xs text-sepia hover:text-cafe underline underline-offset-4"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  )
}
