// Store Zustand de autenticação — sessão do Supabase Auth + perfil (public.users).

import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  session: null,
  user: null, // auth user (supabase.auth) — id, email, etc.
  profile: null, // linha de public.users — full_name, role, etc.
  isLoading: true,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),

  reset: () => set({ session: null, user: null, profile: null, isLoading: false }),
}));

export const selectIsAuthenticated = (state) => Boolean(state.user);
export const selectIsAdmin = (state) => state.profile?.role === 'admin';
export const selectDisplayName = (state) =>
  state.profile?.full_name?.split(' ')[0] ?? state.user?.email?.split('@')[0] ?? '';
