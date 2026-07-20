import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBooks } from '@/hooks/useBooks'
import BookGrid from '@/components/books/BookGrid'
import BookFilters from '@/components/books/BookFilters'
import EmptyState from '@/components/ui/EmptyState'

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(searchParams.get('categoria') || '')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    if (category) {
      setSearchParams({ categoria: category })
    } else {
      setSearchParams({})
    }
  }, [category, setSearchParams])

  const { data: books = [], isLoading } = useBooks({ search, category, sort })

  return (
    <div className="container-book py-16">
      <div className="mb-12">
        <div className="eyebrow mb-2">Acervo completo</div>
        <h1 className="font-display text-display-lg text-balance">
          Todos os livros da estante
        </h1>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-12">
        <aside className="space-y-8">
          <BookFilters
            search={search}
            setSearch={setSearch}
            category={category}
            setCategory={setCategory}
            sort={sort}
            setSort={setSort}
          />
        </aside>

        <div>
          <div className="mb-6 pb-4 border-b border-sepia/15 flex items-center justify-between">
            <div className="font-mono text-xs text-sepia">
              {isLoading
                ? 'carregando…'
                : `${books.length} título${books.length === 1 ? '' : 's'} encontrado${books.length === 1 ? '' : 's'}`}
            </div>
          </div>

          {books.length === 0 && !isLoading ? (
            <EmptyState
              title="Nenhum título encontrado"
              description="Tente ajustar os filtros ou remover a busca."
            />
          ) : (
            <BookGrid books={books} loading={isLoading} />
          )}
        </div>
      </div>
    </div>
  )
}
