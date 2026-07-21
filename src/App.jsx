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
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminBooks = lazy(() => import('./pages/admin/Books'))
const AdminRentals = lazy(() => import('./pages/admin/Rentals'))
const AdminReturns = lazy(() => import('./pages/admin/Returns'))
const AdminReaders = lazy(() => import('./pages/admin/Readers'))
const AdminReaderDetail = lazy(() => import('./pages/admin/ReaderDetail'))
const AdminCategories = lazy(() => import('./pages/admin/Categories'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))
const AdminNewRental = lazy(() => import('./pages/admin/NewRental'))

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
      </Route>
    </Routes>
  )
}
