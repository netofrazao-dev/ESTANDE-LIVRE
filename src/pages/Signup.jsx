import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MailCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import Turnstile, { isCaptchaEnabled } from '@/components/ui/Turnstile'

export default function Signup() {
  const signUp = useAuthStore((s) => s.signUp)

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [createdEmail, setCreatedEmail] = useState(null) // controla a tela de "confirme seu e-mail"

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.phone.trim()) {
      toast.error('Informe seu telefone.')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (form.password.length < 6) {
      toast.error('A senha precisa ter ao menos 6 caracteres.')
      return
    }
    if (!privacyAccepted) {
      toast.error('É preciso aceitar a Política de Privacidade.')
      return
    }
    if (isCaptchaEnabled && !captchaToken) {
      toast.error('Confirme que você não é um robô.')
      return
    }
    setLoading(true)
    try {
      await signUp({ ...form, captchaToken, privacyAccepted })
      setCreatedEmail(form.email)
    } catch (err) {
      toast.error(err.message || 'Não foi possível criar o cadastro.')
    } finally {
      setLoading(false)
    }
  }

  // Tela de confirmação — fica visível até o leitor agir, não some sozinha
  // como um toast passageiro.
  if (createdEmail) {
    return (
      <div className="container-book py-16 md:py-24">
        <div className="max-w-md mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-musgo/10 flex items-center justify-center mx-auto mb-6">
            <MailCheck className="w-6 h-6 text-musgo" />
          </div>
          <h1 className="font-display text-display-sm mb-3">Confirme seu e-mail</h1>
          <p className="text-cafe/70 text-sm text-pretty mb-2">
            Enviamos um link de confirmação para <strong>{createdEmail}</strong>.
          </p>
          <p className="text-cafe/70 text-sm text-pretty mb-8">
            Clique no link do e-mail para ativar sua conta. Se não encontrar, confira também
            a caixa de spam — às vezes o primeiro e-mail cai lá.
          </p>
          <Link to="/entrar" className="text-musgo hover:underline underline-offset-4 text-sm">
            Já confirmei, ir para o login
          </Link>
        </div>
      </div>
    )
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
            label="Telefone"
            type="tel"
            value={form.phone}
            onChange={update('phone')}
            placeholder="(96) 99999-9999"
            required
            hint="Precisamos pra combinar retirada/entrega e avisar sobre seus empréstimos"
          />
          <div className="grid grid-cols-2 gap-4">
            <PasswordInput
              label="Senha"
              value={form.password}
              onChange={update('password')}
              required
              autoComplete="new-password"
              hint="Mín. 6 caracteres"
            />
            <PasswordInput
              label="Confirmar"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              required
              autoComplete="new-password"
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-musgo cursor-pointer"
            />
            <span className="text-xs text-cafe/70 leading-relaxed">
              Li e aceito a{' '}
              <Link to="/privacidade" target="_blank" className="text-musgo hover:underline underline-offset-4">
                Política de Privacidade
              </Link>
              {' '}e autorizo o uso dos meus dados para gestão da locação, conforme a LGPD.
            </span>
          </label>

          <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

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
