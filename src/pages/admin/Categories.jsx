import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCategories, useSaveCategory, useDeleteCategory } from '@/hooks/useBooks'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { slugify } from '@/lib/utils'

const emptyCategory = { name: '', slug: '', description: '' }

export default function AdminCategories() {
  const { data: categories = [], isLoading } = useCategories()
  const saveCategory = useSaveCategory()
  const deleteCategory = useDeleteCategory()
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const handleSave = async () => {
    try {
      await saveCategory.mutateAsync({
        ...editing,
        slug: editing.slug || slugify(editing.name),
      })
      toast.success(editing.id ? 'Categoria atualizada.' : 'Categoria criada.')
      setEditing(null)
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar categoria.')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCategory.mutateAsync(deleting.id)
      toast.success('Categoria removida.')
      setDeleting(null)
    } catch (err) {
      toast.error(
        err.message?.includes('foreign key')
          ? 'Essa categoria ainda tem livros vinculados. Mude a categoria deles primeiro.'
          : err.message || 'Erro ao remover.',
      )
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="eyebrow mb-2">Taxonomia</div>
          <h1 className="font-display text-display-md">Categorias</h1>
          <p className="text-sm text-cafe/70 mt-2">
            {categories.length} categoria{categories.length === 1 ? '' : 's'} no acervo.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...emptyCategory })}>
          <Plus className="w-4 h-4" /> Nova categoria
        </Button>
      </div>

      <div className="border border-sepia/15 bg-pergaminho divide-y divide-sepia/10">
        {isLoading ? (
          <div className="text-center py-10 text-sepia">Carregando…</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 text-sepia">Nenhuma categoria ainda.</div>
        ) : (
          categories.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{c.name}</div>
                {c.description && (
                  <div className="text-xs text-cafe/60 mt-0.5">{c.description}</div>
                )}
              </div>
              <div className="font-mono text-[10px] text-sepia">{c.slug}</div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(c)}
                  className="p-2 text-sepia hover:text-musgo transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleting(c)}
                  className="p-2 text-sepia hover:text-terracota transition-colors"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal criar/editar */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar categoria' : 'Nova categoria'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saveCategory.isPending}>
              {editing?.id ? 'Salvar' : 'Criar categoria'}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Input
              label="Nome"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              required
              autoFocus
            />
            <Input
              label="Descrição (opcional)"
              value={editing.description || ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
            <p className="text-[11px] text-sepia">
              O identificador (slug) é gerado automaticamente a partir do nome.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal excluir */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Remover categoria?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="terracota" onClick={handleDelete} loading={deleteCategory.isPending}>
              Remover
            </Button>
          </>
        }
      >
        <p className="text-sm text-cafe/80">
          Remover <strong>"{deleting?.name}"</strong>? Livros já cadastrados nessa categoria
          ficam sem categoria — não são apagados.
        </p>
      </Modal>
    </div>
  )
}
