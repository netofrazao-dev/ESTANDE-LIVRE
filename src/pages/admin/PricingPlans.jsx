import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import {
  usePricingPlans,
  useSavePricingPlan,
  useDeletePricingPlan,
  useSaveTier,
  useDeleteTier,
  useComboPlans,
  useSaveCombo,
  useDeleteCombo,
} from '@/hooks/usePricing'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { formatMoney } from '@/lib/utils'

export default function AdminPricingPlans() {
  const { data: plans = [], isLoading } = usePricingPlans()
  const { data: combos = [] } = useComboPlans()
  const savePlan = useSavePricingPlan()
  const deletePlan = useDeletePricingPlan()
  const saveTier = useSaveTier()
  const deleteTier = useDeleteTier()
  const saveCombo = useSaveCombo()
  const deleteCombo = useDeleteCombo()

  const [editingPlan, setEditingPlan] = useState(null)
  const [deletingPlan, setDeletingPlan] = useState(null)
  const [editingTier, setEditingTier] = useState(null)
  const [deletingTier, setDeletingTier] = useState(null)
  const [editingCombo, setEditingCombo] = useState(null)
  const [deletingCombo, setDeletingCombo] = useState(null)

  const handleSavePlan = async () => {
    try {
      await savePlan.mutateAsync(editingPlan)
      toast.success('Plano salvo.')
      setEditingPlan(null)
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar plano.')
    }
  }

  const handleSaveTier = async () => {
    try {
      await saveTier.mutateAsync({
        ...editingTier,
        days: Number(editingTier.days),
        price: Number(editingTier.price),
        daily_fine_normal: Number(editingTier.daily_fine_normal),
        daily_fine_reserved: Number(editingTier.daily_fine_reserved),
      })
      toast.success('Prazo salvo.')
      setEditingTier(null)
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar prazo.')
    }
  }

  const handleSaveCombo = async () => {
    try {
      await saveCombo.mutateAsync({
        ...editingCombo,
        book_count: Number(editingCombo.book_count),
        days: Number(editingCombo.days),
        price: Number(editingCombo.price),
      })
      toast.success('Combo salvo.')
      setEditingCombo(null)
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar combo.')
    }
  }

  return (
    <div>
      <div className="mb-10">
        <div className="eyebrow mb-2">Precificação</div>
        <h1 className="font-display text-display-md">Planos de preço</h1>
        <p className="text-sm text-cafe/70 mt-2 text-pretty">
          Cada livro pertence a um plano. Cada plano tem várias opções de prazo, com preço e
          multas (normal e de livro reservado) próprios.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl">Planos</h2>
        <Button size="sm" onClick={() => setEditingPlan({ name: '', description: '' })}>
          <Plus className="w-3.5 h-3.5" /> Novo plano
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sepia text-sm py-6">Carregando…</div>
      ) : plans.length === 0 ? (
        <div className="text-sepia text-sm py-6">Nenhum plano cadastrado ainda.</div>
      ) : (
        <div className="space-y-4 mb-14">
          {plans.map((plan) => (
            <div key={plan.id} className="ficha">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-display text-lg">{plan.name}</div>
                  {plan.description && (
                    <div className="text-xs text-cafe/60 mt-0.5">{plan.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditingPlan(plan)} className="p-2 text-sepia hover:text-musgo transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeletingPlan(plan)} className="p-2 text-sepia hover:text-terracota transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="border border-sepia/15 divide-y divide-sepia/10 bg-pergaminho-dark/20">
                {plan.tiers.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-sepia">Nenhum prazo cadastrado.</div>
                ) : (
                  plan.tiers.map((t) => (
                    <div key={t.id} className="flex items-center gap-4 px-4 py-2.5 text-sm">
                      <div className="font-mono w-16">{t.days}d</div>
                      <div className="font-mono w-20">{formatMoney(t.price)}</div>
                      <div className="text-xs text-cafe/60 flex-1">
                        Multa normal: <span className="font-mono">{formatMoney(t.daily_fine_normal)}/dia</span>
                        {' · '}
                        reservado: <span className="font-mono">{formatMoney(t.daily_fine_reserved)}/dia</span>
                      </div>
                      <button onClick={() => setEditingTier({ ...t, plan_id: plan.id })} className="p-1.5 text-sepia hover:text-musgo transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeletingTier(t)} className="p-1.5 text-sepia hover:text-terracota transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() =>
                  setEditingTier({ plan_id: plan.id, days: '', price: '', daily_fine_normal: '', daily_fine_reserved: '' })
                }
                className="mt-2 text-xs text-musgo hover:underline underline-offset-4"
              >
                + Adicionar prazo
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl">Combos</h2>
        <Button size="sm" onClick={() => setEditingCombo({ name: '', book_count: 3, days: 30, price: '', active: true })}>
          <Plus className="w-3.5 h-3.5" /> Novo combo
        </Button>
      </div>

      {combos.length === 0 ? (
        <div className="text-sepia text-sm py-6">Nenhum combo cadastrado.</div>
      ) : (
        <div className="border border-sepia/15 bg-pergaminho divide-y divide-sepia/10">
          {combos.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-4 py-3">
              <Package className="w-4 h-4 text-sepia flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-cafe/60">
                  {c.book_count} livros · {c.days} dias · {formatMoney(c.price)}
                  {!c.active && <span className="text-terracota"> · inativo</span>}
                </div>
              </div>
              <button onClick={() => setEditingCombo(c)} className="p-2 text-sepia hover:text-musgo transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => setDeletingCombo(c)} className="p-2 text-sepia hover:text-terracota transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        title={editingPlan?.id ? 'Editar plano' : 'Novo plano'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingPlan(null)}>Cancelar</Button>
            <Button onClick={handleSavePlan} loading={savePlan.isPending}>Salvar</Button>
          </>
        }
      >
        {editingPlan && (
          <div className="space-y-4">
            <Input label="Nome do plano" value={editingPlan.name} onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} autoFocus />
            <Input label="Descrição (opcional)" value={editingPlan.description || ''} onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })} />
          </div>
        )}
      </Modal>

      <Modal
        open={!!deletingPlan}
        onClose={() => setDeletingPlan(null)}
        title="Remover plano?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingPlan(null)}>Cancelar</Button>
            <Button
              variant="terracota"
              loading={deletePlan.isPending}
              onClick={async () => {
                try {
                  await deletePlan.mutateAsync(deletingPlan.id)
                  toast.success('Plano removido.')
                  setDeletingPlan(null)
                } catch (err) {
                  toast.error(err.message || 'Livros ainda usando este plano precisam trocar primeiro.')
                }
              }}
            >
              Remover
            </Button>
          </>
        }
      >
        <p className="text-sm text-cafe/80">
          Remover <strong>"{deletingPlan?.name}"</strong>? Livros vinculados a este plano vão
          precisar de um novo plano antes de poderem ser alugados de novo.
        </p>
      </Modal>

      <Modal
        open={!!editingTier}
        onClose={() => setEditingTier(null)}
        title={editingTier?.id ? 'Editar prazo' : 'Novo prazo'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingTier(null)}>Cancelar</Button>
            <Button onClick={handleSaveTier} loading={saveTier.isPending}>Salvar</Button>
          </>
        }
      >
        {editingTier && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Dias" type="number" min={1} value={editingTier.days} onChange={(e) => setEditingTier({ ...editingTier, days: e.target.value })} autoFocus />
            <Input label="Preço (R$)" type="number" min={0} step="0.01" value={editingTier.price} onChange={(e) => setEditingTier({ ...editingTier, price: e.target.value })} />
            <Input label="Multa normal (R$/dia)" type="number" min={0} step="0.01" value={editingTier.daily_fine_normal} onChange={(e) => setEditingTier({ ...editingTier, daily_fine_normal: e.target.value })} />
            <Input label="Multa reservado (R$/dia)" type="number" min={0} step="0.01" value={editingTier.daily_fine_reserved} onChange={(e) => setEditingTier({ ...editingTier, daily_fine_reserved: e.target.value })} hint="Aplicada quando há fila de espera" />
          </div>
        )}
      </Modal>

      <Modal
        open={!!deletingTier}
        onClose={() => setDeletingTier(null)}
        title="Remover este prazo?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingTier(null)}>Cancelar</Button>
            <Button
              variant="terracota"
              loading={deleteTier.isPending}
              onClick={async () => {
                await deleteTier.mutateAsync(deletingTier.id)
                toast.success('Prazo removido.')
                setDeletingTier(null)
              }}
            >
              Remover
            </Button>
          </>
        }
      >
        <p className="text-sm text-cafe/80">Locações já feitas com este prazo não são afetadas.</p>
      </Modal>

      <Modal
        open={!!editingCombo}
        onClose={() => setEditingCombo(null)}
        title={editingCombo?.id ? 'Editar combo' : 'Novo combo'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingCombo(null)}>Cancelar</Button>
            <Button onClick={handleSaveCombo} loading={saveCombo.isPending}>Salvar</Button>
          </>
        }
      >
        {editingCombo && (
          <div className="space-y-4">
            <Input label="Nome" value={editingCombo.name} onChange={(e) => setEditingCombo({ ...editingCombo, name: e.target.value })} autoFocus />
            <div className="grid grid-cols-3 gap-4">
              <Input label="Nº de livros" type="number" min={1} value={editingCombo.book_count} onChange={(e) => setEditingCombo({ ...editingCombo, book_count: e.target.value })} />
              <Input label="Dias" type="number" min={1} value={editingCombo.days} onChange={(e) => setEditingCombo({ ...editingCombo, days: e.target.value })} />
              <Input label="Preço total (R$)" type="number" min={0} step="0.01" value={editingCombo.price} onChange={(e) => setEditingCombo({ ...editingCombo, price: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editingCombo.active} onChange={(e) => setEditingCombo({ ...editingCombo, active: e.target.checked })} className="w-4 h-4 accent-musgo" />
              <span className="text-sm">Ativo (visível no checkout)</span>
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deletingCombo}
        onClose={() => setDeletingCombo(null)}
        title="Remover combo?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingCombo(null)}>Cancelar</Button>
            <Button
              variant="terracota"
              loading={deleteCombo.isPending}
              onClick={async () => {
                await deleteCombo.mutateAsync(deletingCombo.id)
                toast.success('Combo removido.')
                setDeletingCombo(null)
              }}
            >
              Remover
            </Button>
          </>
        }
      >
        <p className="text-sm text-cafe/80">
          Locações já feitas com este combo não são afetadas — só desaparece como opção nova.
        </p>
      </Modal>
    </div>
  )
}
