import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useSettingsStore } from './settingsStore'
import toast from 'react-hot-toast'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // [{ book_id, title, author, cover_url, slug }]
      isOpen: false,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      addBook: (book) => {
        const items = get().items
        const maxBooks = useSettingsStore.getState().maxBooksPerRental
        if (items.find((i) => i.book_id === book.id)) {
          toast.error('Este título já está na sua sacola.')
          return false
        }
        if (items.length >= maxBooks) {
          toast.error(`Limite de ${maxBooks} livros por locação atingido.`)
          return false
        }
        set({
          items: [
            ...items,
            {
              book_id: book.id,
              title: book.title,
              author: book.author,
              cover_url: book.cover_url,
              slug: book.slug,
            },
          ],
          isOpen: true,
        })
        toast.success(`"${book.title}" adicionado à sacola.`)
        return true
      },

      removeBook: (bookId) => {
        set({ items: get().items.filter((i) => i.book_id !== bookId) })
      },

      clear: () => set({ items: [] }),

      count: () => get().items.length,
      isFull: () => get().items.length >= useSettingsStore.getState().maxBooksPerRental,
    }),
    { name: 'estante-livre-cart' },
  ),
)
