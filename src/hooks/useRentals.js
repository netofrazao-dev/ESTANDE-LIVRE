import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { addDays } from 'date-fns'
import { RENTAL_CONFIG } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settingsStore'

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

// Criar aluguéis (checkout) — via RPC atômica no banco, com trava de linha
// por livro. Evita que duas pessoas "ganhem" o último exemplar ao mesmo
// tempo: a segunda tentativa concorrente espera a primeira terminar e só
// então vê corretamente que o livro não está mais disponível.
export const useCheckout = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookIds, termsAccepted }) => {
      if (!termsAccepted) throw new Error('É preciso aceitar os termos de locação.')
      if (!bookIds?.length) throw new Error('Sacola vazia.')

      // Usa os valores VIGENTES agora (configurados pelo admin em
      // /admin/configuracoes) — congelados na própria locação pelo RPC.
      const s = useSettingsStore.getState()

      const { data, error } = await supabase.rpc('create_checkout', {
        book_ids: bookIds,
        rental_days_input: s.rentalDays,
        daily_fine_input: s.dailyFine,
        damage_fee_input: s.damageFee,
        loss_fee_input: s.lossFee,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] })
      qc.invalidateQueries({ queryKey: ['books'] })
    },
  })
}

// Checkout assistido pelo admin — locação registrada no balcão, em nome
// de outro leitor. Mesma trava atômica do checkout normal.
export const useAdminCheckout = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ targetUserId, bookIds }) => {
      if (!bookIds?.length) throw new Error('Selecione ao menos um livro.')
      const s = useSettingsStore.getState()

      const { data, error } = await supabase.rpc('admin_checkout', {
        target_user_id: targetUserId,
        book_ids: bookIds,
        rental_days_input: s.rentalDays,
        daily_fine_input: s.dailyFine,
        damage_fee_input: s.damageFee,
        loss_fee_input: s.lossFee,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] })
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

// Admin cria um leitor novo (locação no balcão, sem a pessoa passar pelo
// cadastro sozinha) — via Edge Function com chave de serviço, já que criar
// um usuário de autenticação não é algo que a chave anon pode fazer.
export const useCreateReaderByAdmin = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ fullName, email, phone }) => {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Sessão expirada. Faça login novamente.')

      const { data, error } = await supabase.functions.invoke('admin-create-reader', {
        body: { full_name: fullName, email, phone },
        headers: { Authorization: `Bearer ${token}` },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['readers'] })
    },
  })
}

// Promover leitor a administrador (a policy de RLS já permite; só falta a
// ação na interface). Ação sensível — o formulário chama isso só depois
// de confirmação explícita.
export const usePromoteToAdmin = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['readers'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
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
      const [books, activeRentals, lateRentals, totalRentals, pending] = await Promise.all([
        supabase.from('books').select('*', { count: 'exact', head: true }),
        supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
          .from('rentals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .lt('due_date', new Date().toISOString()),
        supabase.from('rentals').select('*', { count: 'exact', head: true }),
        supabase.from('financial_pending_view').select('pending_amount'),
      ])
      const pendingTotal = (pending.data || []).reduce(
        (sum, r) => sum + Number(r.pending_amount || 0),
        0,
      )
      return {
        totalBooks: books.count || 0,
        activeRentals: activeRentals.count || 0,
        lateRentals: lateRentals.count || 0,
        totalRentals: totalRentals.count || 0,
        pendingFines: pendingTotal,
        pendingFinesCount: (pending.data || []).length,
      }
    },
  })
}

// ── Renovação de empréstimo ──────────────────────────────────────
export const useRenewRental = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ rentalId, extensionDays }) => {
      const days = extensionDays ?? useSettingsStore.getState().rentalDays
      const { data, error } = await supabase.rpc('renew_rental', {
        rental_id_input: rentalId,
        extension_days: days,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] })
    },
  })
}

// ── Registrar pagamento de multa (admin) ─────────────────────────
export const useRegisterPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ rentalId, payLate = true, payDamage = true, method = 'cash', notes }) => {
      const { data, error } = await supabase.rpc('register_payment', {
        rental_id_input: rentalId,
        pay_late: payLate,
        pay_damage: payDamage,
        method,
        notes_input: notes || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      qc.invalidateQueries({ queryKey: ['financial-pending'] })
    },
  })
}

// Lista de pendências financeiras (admin)
export const useFinancialPending = () => {
  return useQuery({
    queryKey: ['financial-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_pending_view')
        .select('*')
        .order('due_date', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}

// ── Leitores (admin) ──────────────────────────────────────────────
export const useReaders = (search = '') => {
  return useQuery({
    queryKey: ['readers', search],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'user')
        .order('full_name', { ascending: true })

      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

export const useReaderStats = (readerId) => {
  return useQuery({
    queryKey: ['reader-stats', readerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('reader_stats', { reader_id: readerId })
        .single()
      if (error) throw error
      return data
    },
    enabled: !!readerId,
  })
}

export const useReaderRentals = (readerId) => {
  return useQuery({
    queryKey: ['rentals', 'reader', readerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select('*, book:books(id, title, author, cover_url)')
        .eq('user_id', readerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!readerId,
  })
}
