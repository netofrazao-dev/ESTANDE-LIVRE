import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ForgotPassword() {
  const resetPasswordForEmail = useAuthStore((s) => s.resetPasswordForEmail)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPasswordForEmail(email)
      setSent(true)
    } catch (err) {
      // Por segurança, não revelamos se o e-mail existe ou não no banco.
      // O comportamento visual é o mesmo em qualquer caso.
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="container-book py-16 md:py-24">
        <div className="max-w-md mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-musgo/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-6 h-6 text-musgo" />
          </div>
          <h1 className="font-display text-display-sm mb-3">Verifique seu e-mail</h1>
          <p className="text-cafe/70 text-sm text-pretty mb-8">
            Se <strong>{email}</strong> estiver cadastrado, você vai receber um link para
            redefinir sua senha em instantes. Confira também a caixa de spam.
          </p>
          <Link to="/entrar" className="text-musgo hover:underline underline-offset-4 text-sm">
            Voltar para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-book py-16 md:py-24">
      <div className="max-w-md mx-auto">
        <div className="eyebrow mb-2">Recuperação de acesso</div>
        <h1 className="font-display text-display-md mb-2">Esqueceu sua senha?</h1>
        <p className="text-cafe/70 text-sm mb-10 text-pretty">
          Informe o e-mail do seu cadastro. Enviamos um link para você criar uma senha nova.
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
          <Button type="submit" loading={loading} className="w-full">
            <Mail className="w-4 h-4" /> Enviar link de redefinição
          </Button>
        </form>

        <div className="rule-double my-8" />

        <p className="text-sm text-center text-cafe/70">
          Lembrou a senha?{' '}
          <Link to="/entrar" className="text-musgo hover:underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
