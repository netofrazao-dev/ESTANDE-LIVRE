import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signIn, signUp } from '../services/auth.service';
import Button from '../components/ui/Button';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname ?? '/';

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  const isRegister = mode === 'register';

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await signUp({ fullName: form.fullName, email: form.email, password: form.password });
        setInfoMessage('Conta criada! Verifique seu e-mail para confirmar o cadastro, se necessário.');
        setMode('login');
      } else {
        await signIn({ email: form.email, password: form.password });
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(err.message ?? 'Algo deu errado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-md border border-wood-200 bg-parchment-light p-8 shadow-shelf">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl font-bold text-wood-800">
            {isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}
          </h1>
          <p className="mt-1 font-sans text-sm text-wood-500">
            {isRegister
              ? 'Cadastre-se para começar a alugar livros.'
              : 'Entre para ver seus aluguéis e continuar lendo.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label htmlFor="fullName" className="mb-1 block font-sans text-xs font-semibold text-wood-600">
                Nome completo
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={handleChange('fullName')}
                className="w-full rounded-md border border-wood-200 bg-parchment px-3.5 py-2.5 font-sans text-sm text-wood-800 shadow-inner transition-all duration-300 focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
                placeholder="Como devemos te chamar?"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block font-sans text-xs font-semibold text-wood-600">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange('email')}
              className="w-full rounded-md border border-wood-200 bg-parchment px-3.5 py-2.5 font-sans text-sm text-wood-800 shadow-inner transition-all duration-300 focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
              placeholder="voce@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block font-sans text-xs font-semibold text-wood-600">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={handleChange('password')}
              className="w-full rounded-md border border-wood-200 bg-parchment px-3.5 py-2.5 font-sans text-sm text-wood-800 shadow-inner transition-all duration-300 focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-200"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && <p className="font-sans text-sm font-medium text-terracotta-600">{error}</p>}
          {infoMessage && <p className="font-sans text-sm font-medium text-moss-700">{infoMessage}</p>}

          <Button type="submit" variant="primary" fullWidth isLoading={isSubmitting}>
            {isRegister ? 'Criar conta' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 text-center font-sans text-sm text-wood-500">
          {isRegister ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? 'login' : 'register');
              setError(null);
              setInfoMessage(null);
            }}
            className="font-semibold text-moss-700 underline-offset-2 hover:underline"
          >
            {isRegister ? 'Entrar' : 'Cadastre-se'}
          </button>
        </p>

        <p className="mt-4 text-center">
          <Link to="/" className="font-sans text-xs text-wood-400 hover:text-wood-600">
            ← Voltar para o catálogo
          </Link>
        </p>
      </div>
    </div>
  );
}
