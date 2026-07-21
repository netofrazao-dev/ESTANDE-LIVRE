import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Reservas do leitor logado
export const useMyReservations = (userId) => {
  return useQuery({
    queryKey: ['reservations', 'me', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, book:books(id, title, author, cover_url, slug)')
        .eq('user_id', userId)
        .in('status', ['waiting', 'notified'])
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}

// Posição na fila de um livro específico (para o leitor já reservado)
export const useReservationPosition = (reservationId) => {
  return useQuery({
    queryKey: ['reservation-position', reservationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('reservation_position', {
        reservation_id_input: reservationId,
      })
      if (error) throw error
      return data
    },
    enabled: !!reservationId,
  })
}

// Quantas pessoas na fila de um livro (contagem simples, pra exibir no PDP)
export const useWaitlistCount = (bookId) => {
  return useQuery({
    queryKey: ['waitlist-count', bookId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', bookId)
        .eq('status', 'waiting')
      if (error) throw error
      return count || 0
    },
    enabled: !!bookId,
  })
}

export const useCreateReservation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (bookId) => {
      const { data, error } = await supabase.rpc('create_reservation', {
        book_id_input: bookId,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['waitlist-count'] })
    },
  })
}

export const useCancelReservation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (reservationId) => {
      const { data, error } = await supabase.rpc('cancel_reservation', {
        reservation_id_input: reservationId,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['waitlist-count'] })
    },
  })
}
