import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated, selectIsAdmin } from '../../store/useAuthStore';

/**
 * Protege uma rota exigindo login (e opcionalmente papel de admin).
 * Uso: <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const location = useLocation();
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isAdmin = useAuthStore(selectIsAdmin);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-serif italic text-wood-500">Abrindo o acervo...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/entrar" replace state={{ from: location }} />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
