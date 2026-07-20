import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, isAdmin } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-sepia" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/entrar" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />
  }

  return children
}
