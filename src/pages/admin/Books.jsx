import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import imageCompression from 'browser-image-compression'
import { useBooks, useSaveBook, useDeleteBook, useCategories } from '@/hooks/useBooks'
import { usePricingPlans } from '@/hooks/usePricing'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { slugify, formatMoney } from '@/lib/utils'

const emptyBook = {
  title: '',
  author: '',
  synopsis: '',
  publisher: '',
  year: '',
  pages: '',
  language: 'Português',
  category_id: '',
  pricing_plan_id: '',
  replacement_value: '',
  cover_url: '',
  total_copies: 1,
  available_copies: 1,
  featured: false,
  catalog_number: '',
}

export default function AdminBooks() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const { data: books = [], isLoading } = useBooks({ search })
  const { data: categories = [] } = useCategories()
  const { data: pricingPlans = [] } = usePricingPlans()
  const saveBook = useSaveBook()
  const deleteBook = useDeleteBook()

  const handleNew = () => setEditing({ ...emptyBook })

  const handleSave = async (book) => {
    try {
      const payload = {
        ...book,
        slug: book.slug || slugify(book.title),
        year: book.year ? Number(book.year) : null,
        pages: book.pages ? Number(book.pages) : null,
        total_copies: Number(book.total_copies) || 1,
        available_copies: Number(book.available_copies) || 0,
        replacement_value: Number(book.replacement_value) || 0,
        pricing_plan_id: book.pricing_plan_id || null,
      }
      await saveBook.mutateAsync(payload)
      toast.success(book.id ? 'Livro atualizado.' : 'Livro catalogado.')
      setEditing(null)
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar.')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteBook.mutateAsync(deleting.id)
      toast.success('Livro removido do acervo.')
      setDeleting(null)
    } catch (err) {
      toast.error(err.message || 'Erro ao remover.')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="eyebrow mb-2">Acervo</div>
          <h1 className="font-display text-display-md">Gestão de livros</h1>
          <p className="text-sm text-cafe/70 mt-2">
            {books.length} título{books.length === 1 ? '' : 's'} catalogado{books.length === 1 ? '' : 's'}.
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4" /> Novo título
        </Button>
      </div>

      {/* Busca */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sepia" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar título ou autor…"
          className="input-boxed pl-10"
        />
      </div>

      {/* Tabela */}
      <div className="border border-sepia/15 overflow-hidden bg-pergaminho">
        <table className="w-full text-sm">
          <thead className="bg-pergaminho-dark/40 border-b border-sepia/15">
            <tr>
              <th className="text-left px-4 py-3 eyebrow">Livro</th>
              <th className="text-left px-4 py-3 eyebrow">Categoria</th>
              <th className="text-left px-4 py-3 eyebrow">Plano de preço</th>
              <th className="text-right px-4 py-3 eyebrow">Cópias</th>
              <th className="text-right px-4 py-3 eyebrow w-32">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sepia/10">
            {isLoading ? (
              <tr><td colSpan="5" className="text-center py-10 text-sepia">Carregando…</td></tr>
            ) : books.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-10 text-sepia">Nenhum título encontrado.</td></tr>
            ) : (
              books.map((book) => (
                <tr key={book.id} className="hover:bg-pergaminho-dark/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-12 bg-pergaminho-darker flex-shrink-0 overflow-hidden">
                        {book.cover_url ? (
                          <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sepia/40">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{book.title}</div>
                        <div className="text-xs text-cafe/60 truncate">{book.author}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-cafe/70">
                    {book.category?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-cafe/70">
                    {book.pricing_plan?.name || (
                      <span className="text-terracota">sem plano</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">
                    <span className={book.available_copies > 0 ? 'text-musgo' : 'text-terracota'}>
                      {book.available_copies}
                    </span>
                    <span className="text-sepia/40"> / {book.total_copies}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditing(book)}
                        className="p-2 text-sepia hover:text-musgo transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(book)}
                        className="p-2 text-sepia hover:text-terracota transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal editar/criar */}
      {editing && (
        <BookForm
          book={editing}
          categories={categories}
          pricingPlans={pricingPlans}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
          saving={saveBook.isPending}
        />
      )}

      {/* Modal excluir */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Remover do acervo?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="terracota" onClick={handleDelete} loading={deleteBook.isPending}>
              Remover em definitivo
            </Button>
          </>
        }
      >
        <p className="text-sm text-cafe/80">
          Você está prestes a remover <strong>"{deleting?.title}"</strong> do acervo.
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  )
}

// ── Formulário de livro ──────────────────────────────────────────
function BookForm({ book, categories, pricingPlans, onCancel, onSave, saving }) {
  const [form, setForm] = useState(book)
  const [uploading, setUploading] = useState(false)

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [field]: value })
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // Comprime no navegador antes de subir — uma foto de celular de 4MB
      // vira ~300KB, sem perda visível numa capa de livro. Menos custo de
      // Storage e carregamento bem mais rápido no catálogo.
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1000,
        useWebWorker: true,
        fileType: 'image/webp',
      })

      const fileName = `${Date.now()}-${slugify(form.title || 'capa')}.webp`
      const { error } = await supabase.storage
        .from('book-covers')
        .upload(fileName, compressed, { upsert: true, contentType: 'image/webp' })
      if (error) throw error
      const { data } = supabase.storage.from('book-covers').getPublicUrl(fileName)
      setForm({ ...form, cover_url: data.publicUrl })
      toast.success('Capa enviada.')
    } catch (err) {
      toast.error('Falha no upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      open
      onClose={onCancel}
      title={book.id ? 'Editar livro' : 'Catalogar novo livro'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onSave(form)} loading={saving}>
            {book.id ? 'Salvar alterações' : 'Catalogar'}
          </Button>
        </>
      }
    >
      <div className="grid md:grid-cols-[200px_1fr] gap-6">
        {/* Capa */}
        <div>
          <label className="eyebrow block mb-2">Capa</label>
          <div className="aspect-[2/3] bg-pergaminho-dark/40 border border-sepia/20 mb-3 overflow-hidden">
            {form.cover_url ? (
              <img src={form.cover_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sepia/40">
                <BookOpen className="w-10 h-10" />
              </div>
            )}
          </div>
          <label className="btn btn-secondary w-full cursor-pointer text-xs">
            {uploading ? 'Enviando…' : 'Enviar capa'}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
        </div>

        {/* Campos */}
        <div className="space-y-4">
          <Input label="Título" value={form.title} onChange={update('title')} required />
          <Input label="Autor" value={form.author} onChange={update('author')} required />

          <div>
            <label className="eyebrow block mb-2">Sinopse</label>
            <textarea
              rows={4}
              value={form.synopsis}
              onChange={update('synopsis')}
              className="input-boxed resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-2">Categoria</label>
              <select
                value={form.category_id || ''}
                onChange={update('category_id')}
                className="input-boxed"
              >
                <option value="">— sem categoria —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Input label="Nº de tombo" value={form.catalog_number || ''} onChange={update('catalog_number')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-2">Plano de preço</label>
              <select
                value={form.pricing_plan_id || ''}
                onChange={update('pricing_plan_id')}
                className="input-boxed"
              >
                <option value="">— sem plano (não pode ser alugado) —</option>
                {pricingPlans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {form.pricing_plan_id && (
                <p className="text-[11px] text-sepia mt-1.5">
                  {pricingPlans
                    .find((p) => p.id === form.pricing_plan_id)
                    ?.tiers.map((t) => `${t.days}d/${formatMoney(t.price)}`)
                    .join(' · ') || 'Plano sem prazos cadastrados ainda'}
                </p>
              )}
            </div>
            <Input
              label="Valor de reposição (R$)"
              type="number"
              min={0}
              step="0.01"
              value={form.replacement_value}
              onChange={update('replacement_value')}
              hint="Cobrado em caso de perda ou capa arrancada"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Editora" value={form.publisher || ''} onChange={update('publisher')} />
            <Input label="Ano" type="number" value={form.year || ''} onChange={update('year')} />
            <Input label="Páginas" type="number" value={form.pages || ''} onChange={update('pages')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Total de cópias"
              type="number"
              min={1}
              value={form.total_copies}
              onChange={update('total_copies')}
            />
            <Input
              label="Cópias disponíveis"
              type="number"
              min={0}
              value={form.available_copies}
              onChange={update('available_copies')}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured || false}
              onChange={update('featured')}
              className="w-4 h-4 accent-musgo"
            />
            <span className="text-sm">Destaque na home</span>
          </label>
        </div>
      </div>
    </Modal>
  )
}
