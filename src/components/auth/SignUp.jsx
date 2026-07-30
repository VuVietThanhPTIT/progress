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

import { AuthLeftPanel } from './SignIn';

export default function SignUp({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Vui lòng nhập đầy đủ email và mật khẩu.'); return; }
    if (password.length < 8) { setError('Mật khẩu phải từ 8 ký tự trở lên.'); return; }
    if (password !== confirmPw) { setError('Mật khẩu xác nhận không khớp.'); return; }

    setLoading(true);
    setError('');
    setSuccess('');
    const res = await signUp(email, password);
    setLoading(false);

    if (res?.error) {
      const msg = typeof res.error === 'string'
        ? res.error
        : res.error?.message || 'Đăng ký thất bại. Kiểm tra lại thông tin!';
      setError(msg);
    } else {
      setSuccess('🎉 Đăng ký thành công! Bạn có thể chuyển sang trang Đăng nhập để sử dụng ngay.');
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
      <AuthLeftPanel />
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">⚡</div>
            <span className="auth-logo-text">Focus Ledger</span>
          </div>

          <h1 className="auth-title">Tạo tài khoản</h1>
          <p className="auth-subtitle">Bắt đầu hành trình theo dõi mục tiêu của bạn.</p>

          {error && <div className="auth-alert error" style={{ marginBottom: '16px' }}>{String(error)}</div>}
          {success && <div className="auth-alert success" style={{ marginBottom: '16px' }}>{success}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input id="signup-email" type="email" className="input" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label">Mật khẩu <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>(≥ 8 ký tự)</span></label>
              <input id="signup-password" type="password" className="input" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu</label>
              <input id="signup-confirm" type="password" className="input" placeholder="••••••••"
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
            </div>
            <button id="signup-submit" type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? '⏳ Đang tạo...' : '🚀 Đăng ký miễn phí'}
            </button>
          </form>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">HOẶC</span>
            <div className="auth-divider-line" />
          </div>

          <button id="signup-google" type="button" className="btn-google" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon />
            Đăng ký bằng Google
          </button>

          <p className="auth-switch">
            Đã có tài khoản?{' '}
            <span className="auth-link" onClick={() => onSwitch('signin')}>Đăng nhập</span>
          </p>
        </div>
      </div>
    </div>
  );
}
