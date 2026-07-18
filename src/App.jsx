import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import CartDrawer from './components/cart/CartDrawer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Home from './pages/Home';
import BookDetail from './pages/BookDetail';
import Login from './pages/Login';
import MinhaConta from './pages/MinhaConta';
import AdminDashboard from './pages/AdminDashboard';
import AdminBooks from './pages/AdminBooks';
import { useAuthListener } from './hooks/useAuthListener';
import { useCheckout } from './hooks/useCheckout';

function AppShell() {
  useAuthListener();
  const [searchTerm, setSearchTerm] = useState('');
  const { checkout, isSubmitting, error: checkoutError } = useCheckout();

  return (
    <div className="min-h-screen bg-parchment">
      <Navbar onSearch={setSearchTerm} />

      <Routes>
        <Route path="/" element={<Home searchTerm={searchTerm} />} />
        <Route path="/livro/:id" element={<BookDetail />} />
        <Route path="/entrar" element={<Login />} />
        <Route
          path="/minha-conta"
          element={
            <ProtectedRoute>
              <MinhaConta />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/livros"
          element={
            <ProtectedRoute adminOnly>
              <AdminBooks />
            </ProtectedRoute>
          }
        />
      </Routes>

      <CartDrawer onCheckout={checkout} isSubmitting={isSubmitting} checkoutError={checkoutError} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
