import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import AdminLayout from './components/admin/AdminLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'

// Portal do Leitor
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import BookDetail from './pages/BookDetail'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import MyRentals from './pages/MyRentals'
import NotFound from './pages/NotFound'

// Admin
import AdminDashboard from './pages/admin/Dashboard'
import AdminBooks from './pages/admin/Books'
import AdminRentals from './pages/admin/Rentals'
import AdminReturns from './pages/admin/Returns'

import { useAuthStore } from './stores/authStore'

export default function App() {
  const initAuth = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <Routes>
      {/* Portal do Leitor */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/acervo" element={<Catalog />} />
        <Route path="/livro/:slug" element={<BookDetail />} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/minha-estante" element={<ProtectedRoute><MyRentals /></ProtectedRoute>} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/cadastrar" element={<Signup />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="livros" element={<AdminBooks />} />
        <Route path="emprestimos" element={<AdminRentals />} />
        <Route path="devolucoes" element={<AdminReturns />} />
      </Route>
    </Routes>
  )
}
