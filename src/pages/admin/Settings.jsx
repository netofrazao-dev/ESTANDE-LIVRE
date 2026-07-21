import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function AdminSettings() {
  const settings = useSettingsStore()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  // Espelha a store local só quando ela carrega/atualiza — assim o
  // formulário não briga com o usuário digitando enquanto o fetch roda.
  useEffect(() => {
    if (settings.loaded || form === null) {
      setForm({
        maxBooksPerRental: settings.maxBooksPerRental,
        rentalDays: settings.rentalDays,
        dailyFine: settings.dailyFine,
        damageFee: settings.damageFee,
        lossFee: settings.lossFee,
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        storePhone: settings.storePhone,
        storeHours: settings.storeHours,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.loaded])

  if (!form) return <div className="text-sepia text-sm">Carregando…</div>

  const update = (field) => (e) => {
    const raw = e.target.value
    const isNumberField = ['maxBooksPerRental', 'rentalDays', 'dailyFine', 'damageFee', 'lossFee'].includes(field)
    setForm({ ...form, [field]: isNumberField ? Number(raw) : raw })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await settings.updateSettings(form)
      toast.success('Configurações salvas. Já valem para novas locações.')
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar. Confira se a migration_v4.sql foi rodada.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-10">
        <div className="eyebrow mb-2">Sistema</div>
        <h1 className="font-display text-display-md">Configurações</h1>
        <p className="text-sm text-cafe/70 mt-2 text-pretty">
          Estes valores valem para <strong>novas</strong> locações a partir de agora.
          Empréstimos já em curso mantêm as regras que o leitor aceitou no momento do
          checkout — mudar aqui não altera contratos já assinados.
        </p>
      </div>

      <div className="space-y-10">
        {/* Regras de locação */}
        <section>
          <h2 className="font-display text-xl mb-4">Regras de locação</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Livros por locação"
              type="number"
              min={1}
              value={form.maxBooksPerRental}
              onChange={update('maxBooksPerRental')}
            />
            <Input
              label="Prazo (dias)"
              type="number"
              min={1}
              value={form.rentalDays}
              onChange={update('rentalDays')}
            />
            <Input
              label="Multa diária (R$)"
              type="number"
              min={0}
              step="0.01"
              value={form.dailyFine}
              onChange={update('dailyFine')}
            />
            <div />
            <Input
              label="Taxa de dano (R$)"
              type="number"
              min={0}
              step="0.01"
              value={form.damageFee}
              onChange={update('damageFee')}
            />
            <Input
              label="Taxa de extravio (R$)"
              type="number"
              min={0}
              step="0.01"
              value={form.lossFee}
              onChange={update('lossFee')}
            />
          </div>
        </section>

        <div className="rule-double" />

        {/* Dados da loja */}
        <section>
          <h2 className="font-display text-xl mb-1">Dados da loja</h2>
          <p className="text-xs text-cafe/60 mb-4">
            Exibidos no rodapé do site, para quem vai retirar os livros presencialmente.
          </p>
          <div className="space-y-4">
            <Input
              label="Nome da locadora"
              value={form.storeName}
              onChange={update('storeName')}
            />
            <Input
              label="Endereço"
              value={form.storeAddress}
              onChange={update('storeAddress')}
              placeholder="Rua Exemplo, 123 — Centro, Breves/PA"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Telefone / WhatsApp"
                value={form.storePhone}
                onChange={update('storePhone')}
                placeholder="(91) 99999-9999"
              />
              <Input
                label="Horário de funcionamento"
                value={form.storeHours}
                onChange={update('storeHours')}
                placeholder="Seg a sáb, 9h às 18h"
              />
            </div>
          </div>
        </section>

        <Button onClick={handleSave} loading={saving} className="w-full md:w-auto">
          <Save className="w-4 h-4" /> Salvar configurações
        </Button>
      </div>
    </div>
  )
}
