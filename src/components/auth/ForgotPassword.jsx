import React, { useState } from 'react';
import { resetPassword } from '../../api/auth';
import '../../styles/auth.css';

export default function ForgotPassword({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Vui lòng nhập email của bạn.'); return; }
    setLoading(true);
    setError('');
    const { error } = await resetPassword(email);
    if (error) {
      setError(error.message || 'Có lỗi xảy ra. Thử lại nhé!');
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <span className="auth-logo-text">Focus Ledger</span>
        </div>

        {sent ? (
          <>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h2 className="auth-title" style={{ marginBottom: 8 }}>Kiểm tra email!</h2>
              <p className="auth-subtitle">
                Chúng tôi đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>.
                Kiểm tra hộp thư (và thư mục spam nhé!).
              </p>
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onSwitch('signin')}>
              ← Quay lại Đăng nhập
            </button>
          </>
        ) : (
          <>
            <h1 className="auth-title">Quên mật khẩu?</h1>
            <p className="auth-subtitle">Nhập email của bạn, chúng tôi sẽ gửi link để đặt lại mật khẩu.</p>

            {error && <div className="auth-alert error" style={{ marginBottom: '16px' }}>{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <button id="forgot-submit" type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? '⏳ Đang gửi...' : '📨 Gửi link đặt lại mật khẩu'}
              </button>
            </form>

            <p className="auth-switch">
              <span className="auth-link" onClick={() => onSwitch('signin')}>← Quay lại Đăng nhập</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
