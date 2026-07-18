// Store Zustand da "Sacola de Leitura" — seleção de livros antes de fechar o aluguel.
// Regra de negócio: no máximo 3 livros por sacola/aluguel.

import { create } from 'zustand';

export const MAX_CART_ITEMS = 3;

export const useCartStore = create((set, get) => ({
  items: [],
  isOpen: false,
  lastError: null,

  /** Adiciona um livro à sacola. Ignora duplicados e respeita o limite de 3. */
  addItem: (book) => {
    const { items } = get();

    if (items.some((item) => item.id === book.id)) {
      set({ lastError: null });
      return { ok: true };
    }

    if (items.length >= MAX_CART_ITEMS) {
      const message = `Sua sacola já tem o máximo de ${MAX_CART_ITEMS} livros.`;
      set({ lastError: message });
      return { ok: false, message };
    }

    set({ items: [...items, book], lastError: null, isOpen: true });
    return { ok: true };
  },

  /** Remove um livro da sacola pelo id. */
  removeItem: (bookId) => {
    set((state) => ({ items: state.items.filter((item) => item.id !== bookId) }));
  },

  /** Alterna entre adicionar/remover — útil para botões de toggle no BookCard. */
  toggleItem: (book) => {
    const { items } = get();
    if (items.some((item) => item.id === book.id)) {
      get().removeItem(book.id);
      return { ok: true };
    }
    return get().addItem(book);
  },

  isInCart: (bookId) => get().items.some((item) => item.id === bookId),

  clearCart: () => set({ items: [], lastError: null }),

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  clearError: () => set({ lastError: null }),
}));

// Helpers derivados — use assim: const count = useCartStore(selectCartCount)
export const selectCartCount = (state) => state.items.length;
export const selectIsCartFull = (state) => state.items.length >= MAX_CART_ITEMS;
