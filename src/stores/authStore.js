import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  initialize: async () => {
    set({ loading: true })
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      await get().loadProfile(session.user.id)
      set({ user: session.user })
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await get().loadProfile(session.user.id)
        set({ user: session.user })
      } else {
        set({ user: null, profile: null })
      }
    })
  },

  loadProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error) set({ profile: data })
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  signUp: async ({ email, password, fullName, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
      },
    })
    if (error) throw error
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  isAdmin: () => get().profile?.role === 'admin',
}))
