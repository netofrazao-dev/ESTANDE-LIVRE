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

  signUp: async ({ email, password, fullName, phone, captchaToken, privacyAccepted }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          privacy_accepted_at: privacyAccepted ? new Date().toISOString() : null,
        },
        captchaToken,
      },
    })
    if (error) throw error
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  // Envia e-mail com link de redefinição de senha
  resetPasswordForEmail: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (error) throw error
  },

  // Define nova senha (usado na página /redefinir-senha, após clicar no link do e-mail)
  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  isAdmin: () => get().profile?.role === 'admin',
}))
