import { supabase, isDemoMode } from './client';

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@focusledger.app',
  user_metadata: { full_name: 'Demo User' },
};

let _demoSession = null;

// ─── Auth API ─────────────────────────────────────────────────────────────────
export async function signUp(email, password) {
  if (isDemoMode) {
    _demoSession = { user: { ...DEMO_USER, email }, access_token: 'demo_token' };
    return { data: { user: _demoSession.user, session: _demoSession }, error: null };
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signIn(email, password) {
  if (isDemoMode) {
    _demoSession = { user: { ...DEMO_USER, email }, access_token: 'demo_token' };
    return { data: { user: _demoSession.user, session: _demoSession }, error: null };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signInWithGoogle() {
  if (isDemoMode) {
    _demoSession = { user: DEMO_USER, access_token: 'demo_token' };
    return { data: { user: DEMO_USER, session: _demoSession }, error: null };
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  return { data, error };
}

export async function signOut() {
  if (isDemoMode) {
    _demoSession = null;
    return { error: null };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email) {
  if (isDemoMode) return { error: null };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  return { error };
}

export async function getSession() {
  if (isDemoMode) return { data: { session: _demoSession }, error: null };
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
}

export async function updatePassword(newPassword) {
  if (isDemoMode) return { error: null };
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}

export async function deleteAccount() {
  if (isDemoMode) {
    _demoSession = null;
    return { error: null };
  }
  // Requires a Supabase Edge Function or admin call to delete user
  const { error } = await supabase.rpc('delete_user_account');
  return { error };
}

export function onAuthStateChange(callback) {
  if (isDemoMode) {
    // Simulate auth state for demo
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return supabase.auth.onAuthStateChange(callback);
}
