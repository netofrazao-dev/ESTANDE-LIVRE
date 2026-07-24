import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { KeyRound } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { user, loading: authLoading, updatePassword } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // O link do e-mail estabelece a sessão de recuperação de forma assíncrona
  // (o cliente Supabase processa o hash da URL). Damos um instante antes de
  // decidir se o link é válido.
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 800)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      toast.error('A senha precisa ter ao menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      await updatePassword(password)
      toast.success('Senha redefinida com sucesso.')
      navigate('/minha-estante')
    } catch (err) {
      toast.error(err.message || 'Não foi possível redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  // Link inválido/expirado: sem sessão depois de dar tempo pro Supabase processar
  if (ready && !authLoading && !user) {
    return (
      <div className="container-book py-16 md:py-24 text-center">
        <div className="max-w-md mx-auto">
          <h1 className="font-display text-display-sm mb-3">Link inválido ou expirado</h1>
          <p className="text-cafe/70 text-sm mb-8 text-pretty">
            O link de redefinição já foi usado ou não é mais válido. Solicite um novo.
          </p>
          <Link to="/esqueci-senha">
            <Button variant="secondary">Solicitar novo link</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-book py-16 md:py-24">
      <div className="max-w-md mx-auto">
        <div className="eyebrow mb-2">Nova senha</div>
        <h1 className="font-display text-display-md mb-2">Redefinir senha</h1>
        <p className="text-cafe/70 text-sm mb-10">
          Escolha uma senha nova para sua conta.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordInput
            label="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            hint="Mín. 6 caracteres"
          />
          <PasswordInput
            label="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Button type="submit" loading={loading} className="w-full">
            <KeyRound className="w-4 h-4" /> Salvar nova senha
          </Button>
        </form>
      </div>
    </div>
  )
}
