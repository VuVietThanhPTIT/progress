import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/auth.css';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Ảnh nền trang Đăng nhập được lưu trong Cài đặt tài khoản (SettingsPage) -> localStorage
export function AuthLeftPanel() {
  const bgImage = localStorage.getItem('focusledger_auth_bg') || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80';
  return (
    <div
      className="auth-left"
      style={{ backgroundImage: `url(${bgImage})` }}
    />
  );
}

export default function SignIn({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle, isDemoMode } = useAuth();

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    const res = await signIn('demo@focusledger.app', 'demo1234');
    setLoading(false);
    if (res?.error) {
      const msg = typeof res.error === 'string' ? res.error : res.error?.message || 'Demo login failed';
      setError(msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Vui lòng nhập email và mật khẩu.'); return; }
    setLoading(true);
    setError('');
    const res = await signIn(email, password);
    setLoading(false);

    if (res?.error) {
      const msg = typeof res.error === 'string'
        ? res.error
        : res.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email/mật khẩu.';
      setError(msg);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    const res = await signInWithGoogle();
    setLoading(false);
    if (res?.error) {
      const msg = typeof res.error === 'string' ? res.error : res.error?.message || 'Google Auth thất bại.';
      setError(msg);
    }
  };

  return (
    <div className="auth-root">
      {/* Left panel with customizable background image */}
      <AuthLeftPanel />

      {/* Right form panel */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">⚡</div>
            <span className="auth-logo-text">Focus Ledger</span>
          </div>

          <h1 className="auth-title">Đăng nhập</h1>
          <p className="auth-subtitle">Tiếp tục hành trình chinh phục mục tiêu.</p>

          {isDemoMode && (
            <div className="demo-banner" style={{ marginBottom: '16px' }}>
              🧪 Demo Mode — Bấm nút bên dưới để vào xem giao diện ngay
            </div>
          )}

          {error && <div className="auth-alert error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                type="email"
                className="input"
                placeholder="ten@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="signin-password">Mật khẩu</label>
                <button
                  type="button"
                  className="auth-link"
                  style={{ fontSize: '12px' }}
                  onClick={() => onSwitch('forgot')}
                >
                  Quên mật khẩu?
                </button>
              </div>
              <input
                id="signin-password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              id="signin-submit"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {isDemoMode && (
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-accent btn-full"
                onClick={handleDemoLogin}
                disabled={loading}
              >
                🚀 Dùng thử Demo (Không cần mật khẩu)
              </button>
            </div>
          )}

          <div className="auth-divider">
            <span className="auth-divider-text">hoặc</span>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-full btn-google"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon />
            Đăng nhập bằng Google
          </button>

          <div className="auth-footer">
            Chưa có tài khoản?{' '}
            <button
              type="button"
              className="auth-link"
              onClick={() => onSwitch('signup')}
            >
              Đăng ký ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
