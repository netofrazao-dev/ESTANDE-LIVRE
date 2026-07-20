import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { RENTAL_CONFIG } from '@/lib/utils'
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
        if (items.find((i) => i.book_id === book.id)) {
          toast.error('Este título já está na sua sacola.')
          return false
        }
        if (items.length >= RENTAL_CONFIG.maxBooksPerRental) {
          toast.error(
            `Limite de ${RENTAL_CONFIG.maxBooksPerRental} livros por locação atingido.`,
          )
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
      isFull: () => get().items.length >= RENTAL_CONFIG.maxBooksPerRental,
    }),
    { name: 'estande-livre-cart' },
  ),
)
