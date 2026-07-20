import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { addDays } from 'date-fns'
import { RENTAL_CONFIG } from '@/lib/utils'

// Aluguéis do usuário logado
export const useMyRentals = (userId) => {
  return useQuery({
    queryKey: ['rentals', 'me', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('*, book:books(id, title, author, cover_url, slug)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}

// Todos os aluguéis (admin)
export const useAllRentals = ({ status } = {}) => {
  return useQuery({
    queryKey: ['rentals', 'all', { status }],
    queryFn: async () => {
      let query = supabase
        .from('rentals')
        .select(`
          *,
          book:books(id, title, author, cover_url),
          user:profiles(id, full_name, email, phone)
        `)
        .order('due_date', { ascending: true })

      if (status) query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

// Criar aluguéis (checkout)
export const useCheckout = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, bookIds, termsAccepted }) => {
      if (!termsAccepted) throw new Error('É preciso aceitar os termos de locação.')
      if (!bookIds?.length) throw new Error('Sacola vazia.')

      const now = new Date()
      const dueDate = addDays(now, RENTAL_CONFIG.rentalDays)

      const rentals = bookIds.map((book_id) => ({
        user_id: userId,
        book_id,
        rented_at: now.toISOString(),
        due_date: dueDate.toISOString(),
        status: 'active',
        terms_accepted_at: now.toISOString(),
        daily_fine_rate: RENTAL_CONFIG.dailyFine,
      }))

      const { data, error } = await supabase
        .from('rentals')
        .insert(rentals)
        .select('*, book:books(id, title, author, cover_url, available_copies)')
      if (error) throw error

      // Decrementar cópias disponíveis
      for (const bookId of bookIds) {
        await supabase.rpc('decrement_available_copies', { book_id_input: bookId })
      }

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] })
      qc.invalidateQueries({ queryKey: ['books'] })
    },
  })
}

// Auditoria de devolução (admin)
export const useReturnBook = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ rentalId, condition, fee = 0, notes = '' }) => {
      const statusMap = {
        ok: 'returned',
        damaged: 'damaged',
        lost: 'lost',
      }

      const { data: rental, error: fetchErr } = await supabase
        .from('rentals')
        .select('book_id, due_date, daily_fine_rate')
        .eq('id', rentalId)
        .single()
      if (fetchErr) throw fetchErr

      // Calcula multa por atraso
      const now = new Date()
      const due = new Date(rental.due_date)
      const daysLate = Math.max(0, Math.floor((now - due) / (1000 * 60 * 60 * 24)))
      const lateFee = daysLate * (rental.daily_fine_rate || RENTAL_CONFIG.dailyFine)

      const { data, error } = await supabase
        .from('rentals')
        .update({
          returned_at: now.toISOString(),
          status: statusMap[condition],
          late_fee: lateFee,
          damage_fee: fee,
          notes,
        })
        .eq('id', rentalId)
        .select()
        .single()
      if (error) throw error

      // Incrementa cópias disponíveis apenas se não foi perdido
      if (condition !== 'lost') {
        await supabase.rpc('increment_available_copies', { book_id_input: rental.book_id })
      }

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] })
      qc.invalidateQueries({ queryKey: ['books'] })
    },
  })
}

// KPIs para dashboard admin
export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [books, activeRentals, lateRentals, totalRentals] = await Promise.all([
        supabase.from('books').select('*', { count: 'exact', head: true }),
        supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
          .from('rentals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .lt('due_date', new Date().toISOString()),
        supabase.from('rentals').select('*', { count: 'exact', head: true }),
      ])
      return {
        totalBooks: books.count || 0,
        activeRentals: activeRentals.count || 0,
        lateRentals: lateRentals.count || 0,
        totalRentals: totalRentals.count || 0,
      }
    },
  })
}
