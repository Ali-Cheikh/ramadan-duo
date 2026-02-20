'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const randomUsername = () => {
    const randomPart = Math.random().toString(36).slice(2, 8);
    return `_${randomPart}`;
  };

  const ensureUsernameOnSignIn = async (signedInUser: User | null) => {
    if (!signedInUser) return;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .eq('id', signedInUser.id)
      .maybeSingle();

    if (profileError) return;

    const displayNameFromMeta =
      (signedInUser.user_metadata?.display_name as string | undefined) || 'Ramadan Warrior';

    if (!profile) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = randomUsername();
        const { error: insertError } = await supabase.from('profiles').insert({
          id: signedInUser.id,
          display_name: displayNameFromMeta,
          username: candidate,
        });

        if (!insertError) return;
      }
      return;
    }

    if (profile.username) return;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = randomUsername();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: candidate })
        .eq('id', signedInUser.id);

      if (!updateError) return;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      await ensureUsernameOnSignIn(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        await ensureUsernameOnSignIn(session?.user ?? null);
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
