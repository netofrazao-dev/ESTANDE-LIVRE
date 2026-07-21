import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Lista completa com filtros
export const useBooks = ({ category, search, sort = 'newest' } = {}) => {
  return useQuery({
    queryKey: ['books', { category, search, sort }],
    queryFn: async () => {
      let query = supabase
        .from('books')
        .select('*, category:categories(id, name, slug)')

      if (category) query = query.eq('category.slug', category)
      if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`)

      switch (sort) {
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'title':
          query = query.order('title', { ascending: true })
          break
        case 'author':
          query = query.order('author', { ascending: true })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

// Detalhe de um livro
export const useBook = (slug) => {
  return useQuery({
    queryKey: ['book', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*, category:categories(id, name, slug)')
        .eq('slug', slug)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!slug,
  })
}

// Destaques da home
export const useFeaturedBooks = () => {
  return useQuery({
    queryKey: ['books', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*, category:categories(id, name, slug)')
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(6)
      if (error) throw error
      return data || []
    },
  })
}

// Recém-chegados
export const useNewArrivals = () => {
  return useQuery({
    queryKey: ['books', 'new'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*, category:categories(id, name, slug)')
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return data || []
    },
  })
}

// Categorias
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

export const useSaveCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (category) => {
      if (category.id) {
        const { data, error } = await supabase
          .from('categories')
          .update(category)
          .eq('id', category.id)
          .select()
          .single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert(category)
          .select()
          .single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export const useDeleteCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

// Admin: CRUD
export const useSaveBook = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (book) => {
      if (book.id) {
        const { data, error } = await supabase
          .from('books')
          .update(book)
          .eq('id', book.id)
          .select()
          .single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase
          .from('books')
          .insert(book)
          .select()
          .single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  })
}

export const useDeleteBook = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('books').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  })
}
