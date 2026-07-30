import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isDemoMode } from '../api/client';
import { getSession, onAuthStateChange, signIn, signUp, signInWithGoogle, signOut } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    getSession().then(({ data }) => {
      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
      setLoading(false);
    });

    if (!isDemoMode) {
      const { data } = onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
      return () => data.subscription.unsubscribe();
    }
  }, []);

  const handleSignIn = async (email, password) => {
    const res = await signIn(email, password);
    if (!res.error && res.data?.user) {
      setUser(res.data.user);
      setSession(res.data.session);
    }
    return res;
  };

  const handleSignUp = async (email, password) => {
    const res = await signUp(email, password);
    if (!res.error && res.data?.user) {
      setUser(res.data.user);
      setSession(res.data.session);
    }
    return res;
  };

  const handleGoogleSignIn = async () => {
    const res = await signInWithGoogle();
    if (!res.error && res.data?.user) {
      setUser(res.data.user);
      setSession(res.data.session);
    }
    return res;
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setSession(null);
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isDemoMode,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signInWithGoogle: handleGoogleSignIn,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
