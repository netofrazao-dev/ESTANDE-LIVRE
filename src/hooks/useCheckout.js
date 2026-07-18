// Orquestra o checkout: pega os itens da sacola, cria os aluguéis no
// Supabase (14 dias de prazo) e limpa a sacola em caso de sucesso.

import { useState } from 'react';
import { createRentalsFromCart } from '../services/rentals.service';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';

export function useCheckout() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const closeCart = useCartStore((s) => s.closeCart);
  const userId = useAuthStore((s) => s.user?.id);

  async function checkout({ termsAccepted } = {}) {
    setError(null);

    if (!userId) {
      setError('Você precisa entrar na sua conta para concluir o aluguel.');
      return { ok: false };
    }

    if (!termsAccepted) {
      setError('Você precisa aceitar os Termos de Locação para concluir o aluguel.');
      return { ok: false };
    }

    setIsSubmitting(true);
    try {
      await createRentalsFromCart(items, userId, { termsAcceptedAt: new Date().toISOString() });
      clearCart();
      closeCart();
      return { ok: true };
    } catch (err) {
      setError(err.message ?? 'Não foi possível concluir o aluguel. Tente novamente.');
      return { ok: false };
    } finally {
      setIsSubmitting(false);
    }
  }

  return { checkout, isSubmitting, error, clearError: () => setError(null) };
}
