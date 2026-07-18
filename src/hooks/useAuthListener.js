// Inicializa e mantém sincronizado o estado de sessão do Supabase Auth.
// Deve ser chamado uma única vez, perto da raiz da aplicação.

import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';
import { fetchUserProfile } from '../services/auth.service';

export function useAuthListener() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let isMounted = true;

    async function syncFromSession(session) {
      setSession(session);

      if (session?.user) {
        try {
          const profile = await fetchUserProfile(session.user.id);
          if (isMounted) setProfile(profile);
        } catch {
          if (isMounted) setProfile(null);
        }
      } else if (isMounted) {
        setProfile(null);
      }

      if (isMounted) setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => syncFromSession(session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromSession(session);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setSession, setProfile, setLoading]);
}
