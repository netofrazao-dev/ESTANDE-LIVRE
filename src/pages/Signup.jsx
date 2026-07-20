import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function Signup() {
  const navigate = useNavigate()
  const signUp = useAuthStore((s) => s.signUp)

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (form.password.length < 6) {
      toast.error('A senha precisa ter ao menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      await signUp(form)
      toast.success('Cadastro criado! Verifique seu e-mail para confirmar.')
      navigate('/entrar')
    } catch (err) {
      toast.error(err.message || 'Não foi possível criar o cadastro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-book py-16 md:py-24">
      <div className="max-w-md mx-auto">
        <div className="eyebrow mb-2">Novo leitor</div>
        <h1 className="font-display text-display-md mb-2">Criar cadastro</h1>
        <p className="text-cafe/70 text-sm mb-10">
          Poucos campos, um clique, e você já pode retirar livros.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nome completo"
            value={form.fullName}
            onChange={update('fullName')}
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={update('email')}
            required
            autoComplete="email"
          />
          <Input
            label="Telefone (opcional)"
            type="tel"
            value={form.phone}
            onChange={update('phone')}
            placeholder="(96) 99999-9999"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Senha"
              type="password"
              value={form.password}
              onChange={update('password')}
              required
              autoComplete="new-password"
              hint="Mín. 6 caracteres"
            />
            <Input
              label="Confirmar"
              type="password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              required
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Criar cadastro
          </Button>
        </form>

        <div className="rule-double my-8" />

        <p className="text-sm text-center text-cafe/70">
          Já é cadastrado?{' '}
          <Link to="/entrar" className="text-musgo hover:underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
