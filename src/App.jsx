import { Routes, Route } from 'react-router-dom'
import { useEffect, Suspense, lazy } from 'react'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'

// Portal do Leitor — carregado no bundle principal (é o que a maioria visita)
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import BookDetail from './pages/BookDetail'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import MyRentals from './pages/MyRentals'
import Account from './pages/Account'
import Privacy from './pages/Privacy'
import NotFound from './pages/NotFound'

// Admin — carregado sob demanda (code splitting). Quem nunca visita o
// backoffice nunca baixa esse código.
// Depois de um deploy novo, os nomes dos arquivos internos mudam. Se
// alguém já estava com o site aberto numa aba antes do deploy e navega
// pra uma parte "lazy" (carregada sob demanda, como o admin), o
// navegador tenta buscar o arquivo antigo, que não existe mais — e
// quebra com "Failed to fetch dynamically imported module". Em vez de
// mostrar esse erro, recarregamos a página uma vez, o que resolve
// sozinho (a aba recarregada já pega a versão atual).
function lazyWithReload(importFn) {
  return lazy(async () => {
    try {
      const mod = await importFn()
      sessionStorage.removeItem('chunk-reload-attempted')
      return mod
    } catch (error) {
      const alreadyReloaded = sessionStorage.getItem('chunk-reload-attempted')
      if (!alreadyReloaded) {
        sessionStorage.setItem('chunk-reload-attempted', '1')
        window.location.reload()
        // Nunca resolve — a página vai recarregar antes disso importar.
        return new Promise(() => {})
      }
      throw error
    }
  })
}

const AdminLayout = lazyWithReload(() => import('./components/admin/AdminLayout'))
const AdminDashboard = lazyWithReload(() => import('./pages/admin/Dashboard'))
const AdminBooks = lazyWithReload(() => import('./pages/admin/Books'))
const AdminRentals = lazyWithReload(() => import('./pages/admin/Rentals'))
const AdminReturns = lazyWithReload(() => import('./pages/admin/Returns'))
const AdminReaders = lazyWithReload(() => import('./pages/admin/Readers'))
const AdminReaderDetail = lazyWithReload(() => import('./pages/admin/ReaderDetail'))
const AdminCategories = lazyWithReload(() => import('./pages/admin/Categories'))
const AdminSettings = lazyWithReload(() => import('./pages/admin/Settings'))
const AdminNewRental = lazyWithReload(() => import('./pages/admin/NewRental'))
const AdminPricingPlans = lazyWithReload(() => import('./pages/admin/PricingPlans'))
const AdminReservations = lazyWithReload(() => import('./pages/admin/Reservations'))

import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'

function AdminFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pergaminho">
      <div className="font-mono text-xs text-sepia tracking-widest">carregando backoffice…</div>
    </div>
  )
}

export default function App() {
  const initAuth = useAuthStore((s) => s.initialize)
  const loadSettings = useSettingsStore((s) => s.load)

  useEffect(() => {
    initAuth()
    loadSettings()
  }, [initAuth, loadSettings])

  return (
    <Routes>
      {/* Portal do Leitor */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/acervo" element={<Catalog />} />
        <Route path="/livro/:slug" element={<BookDetail />} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/minha-estante" element={<ProtectedRoute><MyRentals /></ProtectedRoute>} />
        <Route path="/minha-conta" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/cadastrar" element={<Signup />} />
        <Route path="/esqueci-senha" element={<ForgotPassword />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/privacidade" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin — lazy, com fallback próprio (fora do <Layout /> por isso o Suspense fica aqui) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <Suspense fallback={<AdminFallback />}>
              <AdminLayout />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<Suspense fallback={<AdminFallback />}><AdminDashboard /></Suspense>} />
        <Route path="livros" element={<Suspense fallback={<AdminFallback />}><AdminBooks /></Suspense>} />
        <Route path="emprestimos" element={<Suspense fallback={<AdminFallback />}><AdminRentals /></Suspense>} />
        <Route path="devolucoes" element={<Suspense fallback={<AdminFallback />}><AdminReturns /></Suspense>} />
        <Route path="leitores" element={<Suspense fallback={<AdminFallback />}><AdminReaders /></Suspense>} />
        <Route path="leitores/:id" element={<Suspense fallback={<AdminFallback />}><AdminReaderDetail /></Suspense>} />
        <Route path="categorias" element={<Suspense fallback={<AdminFallback />}><AdminCategories /></Suspense>} />
        <Route path="configuracoes" element={<Suspense fallback={<AdminFallback />}><AdminSettings /></Suspense>} />
        <Route path="nova-locacao" element={<Suspense fallback={<AdminFallback />}><AdminNewRental /></Suspense>} />
        <Route path="planos-de-preco" element={<Suspense fallback={<AdminFallback />}><AdminPricingPlans /></Suspense>} />
        <Route path="reservas" element={<Suspense fallback={<AdminFallback />}><AdminReservations /></Suspense>} />
      </Route>
    </Routes>
  )
}
