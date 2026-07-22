import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ── Planos de preço (com seus tiers/prazos aninhados) ──────────────
export const usePricingPlans = () => {
  return useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*, tiers:pricing_plan_tiers(*)')
        .order('name', { ascending: true })
      if (error) throw error
      // Ordena os tiers de cada plano por prazo
      return (data || []).map((p) => ({
        ...p,
        tiers: (p.tiers || []).sort((a, b) => a.days - b.days),
      }))
    },
  })
}

export const useSavePricingPlan = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, description }) => {
      if (id) {
        const { data, error } = await supabase
          .from('pricing_plans')
          .update({ name, description })
          .eq('id', id)
          .select()
          .single()
        if (error) throw error
        return data
      }
      const { data, error } = await supabase
        .from('pricing_plans')
        .insert({ name, description })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-plans'] }),
  })
}

export const useDeletePricingPlan = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('pricing_plans').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-plans'] }),
  })
}

export const useSaveTier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tier) => {
      if (tier.id) {
        const { data, error } = await supabase
          .from('pricing_plan_tiers')
          .update(tier)
          .eq('id', tier.id)
          .select()
          .single()
        if (error) throw error
        return data
      }
      const { data, error } = await supabase
        .from('pricing_plan_tiers')
        .insert(tier)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-plans'] }),
  })
}

export const useDeleteTier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('pricing_plan_tiers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-plans'] }),
  })
}

// ── Combos ──────────────────────────────────────────────────────────
export const useComboPlans = ({ onlyActive = false } = {}) => {
  return useQuery({
    queryKey: ['combo-plans', { onlyActive }],
    queryFn: async () => {
      let query = supabase.from('combo_plans').select('*').order('price', { ascending: true })
      if (onlyActive) query = query.eq('active', true)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

export const useSaveCombo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (combo) => {
      if (combo.id) {
        const { data, error } = await supabase
          .from('combo_plans')
          .update(combo)
          .eq('id', combo.id)
          .select()
          .single()
        if (error) throw error
        return data
      }
      const { data, error } = await supabase
        .from('combo_plans')
        .insert(combo)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['combo-plans'] }),
  })
}

export const useDeleteCombo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('combo_plans').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['combo-plans'] }),
  })
}

// ── Livros com fila de espera ativa agora ──────────────────────────
// Usado pra decidir, na hora de exibir a multa, se aplica a taxa
// "normal" ou "reservado" — sem isso, cada tela teria que repetir essa
// consulta na mão.
export const useBooksWithActiveWaitlist = () => {
  return useQuery({
    queryKey: ['books-with-waitlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('book_id')
        .in('status', ['waiting', 'notified'])
      if (error) throw error
      return new Set((data || []).map((r) => r.book_id))
    },
    staleTime: 60 * 1000,
  })
}
