import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
          book:books(id, title, author, cover_url, replacement_value),
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

// ── Checkout normal — cada livro com seu próprio prazo/preço ────────
// items: [{ book_id, pricing_tier_id, renewal_days }, ...]
export const useCheckout = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ items, termsAccepted, deliveryMethod = 'pickup', deliveryAddress = null }) => {
      if (!termsAccepted) throw new Error('É preciso aceitar os termos de locação.')
      if (!items?.length) throw new Error('Sacola vazia.')
      if (items.some((i) => !i.pricing_tier_id)) {
        throw new Error('Escolha o prazo de locação para todos os livros.')
      }
      if (deliveryMethod === 'delivery' && !deliveryAddress?.trim()) {
        throw new Error('Informe o endereço de entrega.')
      }

      const { data, error } = await supabase.rpc('create_checkout', {
        items,
        delivery_method: deliveryMethod,
        delivery_address: deliveryAddress,
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

// ── Checkout combo — N livros por preço fixo total ──────────────────
export const useComboCheckout = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      comboPlanId,
      bookIds,
      termsAccepted,
      renewalDays = 0,
      deliveryMethod = 'pickup',
      deliveryAddress = null,
    }) => {
      if (!termsAccepted) throw new Error('É preciso aceitar os termos de locação.')
      if (!bookIds?.length) throw new Error('Selecione os livros do combo.')
      if (deliveryMethod === 'delivery' && !deliveryAddress?.trim()) {
        throw new Error('Informe o endereço de entrega.')
      }

      const { data, error } = await supabase.rpc('create_combo_checkout', {
        combo_plan_id_input: comboPlanId,
        book_ids: bookIds,
        renewal_days_input: renewalDays,
        delivery_method: deliveryMethod,
        delivery_address: deliveryAddress,
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

// Checkout assistido pelo admin — locação registrada no balcão
export const useAdminCheckout = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ targetUserId, items, deliveryMethod = 'pickup', deliveryAddress = null }) => {
      if (!items?.length) throw new Error('Selecione ao menos um livro.')

      const { data, error } = await supabase.rpc('admin_checkout', {
        target_user_id: targetUserId,
        items,
        delivery_method: deliveryMethod,
        delivery_address: deliveryAddress,
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
// cadastro sozinha) — via Edge Function com chave de serviço.
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

// Promover leitor a administrador
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

// ── Devolução — condição granular (ok / dano leve / capa arrancada / perdido)
export const useReturnBook = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ rentalId, condition, notes = '' }) => {
      const { data, error } = await supabase.rpc('process_return', {
        rental_id_input: rentalId,
        condition,
        admin_notes: notes || null,
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
// Por padrão usa os dias de renovação escolhidos pelo leitor no checkout
// (rental.renewal_days) — só passe extensionDays pra sobrepor manualmente.
export const useRenewRental = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ rentalId, extensionDays } = {}) => {
      const { data, error } = await supabase.rpc('renew_rental', {
        rental_id_input: rentalId,
        extension_days: extensionDays ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] })
    },
  })
}

// ── Registrar pagamento — multa, dano/reposição e/ou o preço do aluguel
// ── Pedido (grupo de livros do mesmo checkout) ──────────────────────

// Marca o preço da locação como pago, pra todos os itens do pedido de
// uma vez (multa/dano continuam sendo tratados individualmente, via
// FinePaymentModal — isso aqui é só o valor do aluguel em si).
export const useMarkOrderPaid = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ rentalIds, method = 'cash' }) => {
      const { error } = await supabase
        .from('rentals')
        .update({ rental_paid: true, rental_paid_at: new Date().toISOString(), rental_payment_method: method })
        .in('id', rentalIds)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      qc.invalidateQueries({ queryKey: ['financial-pending'] })
    },
  })
}

// Marca (ou desmarca) que o pedido inteiro já foi entregue/retirado —
// um controle operacional, separado do status do empréstimo em si.
export const useSetOrderDelivered = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ rentalIds, delivered }) => {
      const { error } = await supabase
        .from('rentals')
        .update({ delivered_at: delivered ? new Date().toISOString() : null })
        .in('id', rentalIds)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] })
    },
  })
}

export const useRegisterPayment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      rentalId,
      payLate = true,
      payDamage = true,
      payRental = false,
      method = 'cash',
      notes,
    }) => {
      const { data, error } = await supabase.rpc('register_payment', {
        rental_id_input: rentalId,
        pay_late: payLate,
        pay_damage: payDamage,
        pay_rental: payRental,
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
