import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface Session {
  access_token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica sessão existente ao montar
    const { data: { subscription } } = api.auth.onAuthStateChange(
      (event, sess) => {
        if (event === 'SIGNED_IN' && sess) {
          setSession(sess);
          setUser(sess.user);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await api.auth.signInWithPassword({ email, password });
    if (error) return { error };
    if (data) {
      setUser(data.user);
      setSession(data.session);
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const data = await api.auth.signUp(email, password, name);
      if (data.data?.user) {
        setUser(data.data.user);
        setSession(data.data.session);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    await api.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
