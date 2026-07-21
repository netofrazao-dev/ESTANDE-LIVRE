import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function Account() {
  const { user, profile, loadProfile } = useAuthStore()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone })
        .eq('id', user.id)
      if (error) throw error
      await loadProfile(user.id)
      toast.success('Dados atualizados.')
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-book py-12 md:py-16">
      <div className="max-w-md">
        <div className="eyebrow mb-2">Área do leitor</div>
        <h1 className="font-display text-display-lg mb-10">Minha conta</h1>

        <form onSubmit={handleSave} className="space-y-5">
          <Input
            label="Nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input label="E-mail" value={user?.email || ''} disabled className="opacity-60" />
          <Input
            label="Telefone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(96) 99999-9999"
          />

          <Button type="submit" loading={saving} className="w-full">
            Salvar alterações
          </Button>
        </form>

        <div className="rule-double my-8" />

        <p className="text-sm text-cafe/70">
          Quer trocar sua senha?{' '}
          <Link to="/esqueci-senha" className="text-musgo hover:underline underline-offset-4">
            Solicitar redefinição
          </Link>
        </p>
      </div>
    </div>
  )
}
