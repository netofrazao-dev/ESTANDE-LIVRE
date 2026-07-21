import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((s) => s.signIn)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('Bem-vindo de volta.')
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.message === 'Invalid login credentials'
        ? 'E-mail ou senha inválidos.'
        : 'Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-book py-16 md:py-24">
      <div className="max-w-md mx-auto">
        <div className="eyebrow mb-2">Área do leitor</div>
        <h1 className="font-display text-display-md mb-2">Entrar na estante</h1>
        <p className="text-cafe/70 text-sm mb-10">
          Acompanhe seus aluguéis, prazos e devoluções.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <div className="text-right -mt-2">
            <Link
              to="/esqueci-senha"
              className="text-xs text-sepia hover:text-cafe underline underline-offset-4"
            >
              Esqueceu sua senha?
            </Link>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Entrar
          </Button>
        </form>

        <div className="rule-double my-8" />

        <p className="text-sm text-center text-cafe/70">
          Ainda não tem cadastro?{' '}
          <Link to="/cadastrar" className="text-musgo hover:underline underline-offset-4">
            Criar cadastro
          </Link>
        </p>
      </div>
    </div>
  )
}
