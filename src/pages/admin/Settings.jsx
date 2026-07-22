import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Save, ArrowRight } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function AdminSettings() {
  const settings = useSettingsStore()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings.loaded || form === null) {
      setForm({
        maxBooksPerRental: settings.maxBooksPerRental,
        minorDamageFee: settings.minorDamageFee,
        lostAdminFee: settings.lostAdminFee,
        comboDailyFineNormal: settings.comboDailyFineNormal,
        comboDailyFineReserved: settings.comboDailyFineReserved,
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        storePhone: settings.storePhone,
        storeHours: settings.storeHours,
        whatsappNumber: settings.whatsappNumber,
        instagramUrl: settings.instagramUrl,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.loaded])

  if (!form) return <div className="text-sepia text-sm">Carregando…</div>

  const numberFields = ['maxBooksPerRental', 'minorDamageFee', 'lostAdminFee', 'comboDailyFineNormal', 'comboDailyFineReserved']
  const update = (field) => (e) => {
    const raw = e.target.value
    setForm({ ...form, [field]: numberFields.includes(field) ? Number(raw) : raw })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await settings.updateSettings(form)
      toast.success('Configurações salvas.')
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar. Confira se a migration_v6.sql foi rodada.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-10">
        <div className="eyebrow mb-2">Sistema</div>
        <h1 className="font-display text-display-md">Configurações</h1>
      </div>

      <div className="ficha bg-musgo/5 border-musgo/20 mb-10 flex items-center justify-between gap-4">
        <p className="text-sm text-cafe/80 text-pretty">
          Preço, prazo e multa de cada livro agora vivem em <strong>Planos de Preço</strong>,
          não mais aqui — cada livro pertence a um plano, e cada plano tem suas opções de
          prazo/preço/multa.
        </p>
        <Link to="/admin/planos-de-preco" className="flex-shrink-0">
          <Button variant="secondary" size="sm">
            Ir para Planos <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="font-display text-xl mb-4">Locação</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Livros por locação"
              type="number"
              min={1}
              value={form.maxBooksPerRental}
              onChange={update('maxBooksPerRental')}
              hint="Limite de livros na sacola por vez"
            />
          </div>
        </section>

        <div className="rule-double" />

        <section>
          <h2 className="font-display text-xl mb-1">Danos e extravio</h2>
          <p className="text-xs text-cafe/60 mb-4 text-pretty">
            O valor de reposição do livro é cadastrado por título (em Acervo). Aqui ficam só as
            taxas fixas, que valem para qualquer livro.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dano leve na capa (R$)"
              type="number"
              min={0}
              step="0.01"
              value={form.minorDamageFee}
              onChange={update('minorDamageFee')}
              hint="Amassado ou rasgo pequeno"
            />
            <Input
              label="Taxa administrativa (R$)"
              type="number"
              min={0}
              step="0.01"
              value={form.lostAdminFee}
              onChange={update('lostAdminFee')}
              hint="Somada ao valor de reposição, em perda/capa arrancada"
            />
          </div>
        </section>

        <div className="rule-double" />

        <section>
          <h2 className="font-display text-xl mb-1">Multa do combo</h2>
          <p className="text-xs text-cafe/60 mb-4">
            Aplicada aos livros alugados dentro de um plano combo (preço fixo, não por tier).
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Multa normal (R$/dia)"
              type="number"
              min={0}
              step="0.01"
              value={form.comboDailyFineNormal}
              onChange={update('comboDailyFineNormal')}
            />
            <Input
              label="Multa reservado (R$/dia)"
              type="number"
              min={0}
              step="0.01"
              value={form.comboDailyFineReserved}
              onChange={update('comboDailyFineReserved')}
              hint="Aplicada quando há fila de espera"
            />
          </div>
        </section>

        <div className="rule-double" />

        <section>
          <h2 className="font-display text-xl mb-1">Dados da loja</h2>
          <p className="text-xs text-cafe/60 mb-4">
            Exibidos no rodapé do site, para quem vai retirar os livros presencialmente.
          </p>
          <div className="space-y-4">
            <Input label="Nome da locadora" value={form.storeName} onChange={update('storeName')} />
            <Input
              label="Endereço"
              value={form.storeAddress}
              onChange={update('storeAddress')}
              placeholder="Rua Exemplo, 123 — Centro, Breves/PA"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Telefone"
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
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="WhatsApp"
                value={form.whatsappNumber}
                onChange={update('whatsappNumber')}
                placeholder="+55 91 99999-9999"
                hint="Com DDI e DDD — usado no link de contato direto"
              />
              <Input
                label="Instagram"
                value={form.instagramUrl}
                onChange={update('instagramUrl')}
                placeholder="https://www.instagram.com/seu-perfil/"
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
