import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updatePassword, deleteAccount } from '../../api/auth';

const DEFAULT_BG = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80';
const PRESET_WALLPAPERS = [
  { name: 'Góc làm việc Aesthetic', url: '/login_bg.png' },
  { name: 'Dark Minimalist Workspace', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Thiên nhiên Rừng xanh', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Cyberpunk Neon', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80' },
];

function LoginBgSection() {
  const [bgUrl, setBgUrl] = useState(() => localStorage.getItem('focusledger_auth_bg') || DEFAULT_BG);
  const [inputUrl, setInputUrl] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = (url) => {
    setBgUrl(url);
    localStorage.setItem('focusledger_auth_bg', url);
    setSavedMsg('✓ Đã lưu ảnh nền trang Đăng nhập mới thành công!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          handleSave(evt.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
      <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        🖼️ Tùy chỉnh Ảnh nền trang Đăng nhập
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        Thay đổi ảnh nền hiển thị ở khung bên trái khi bạn Đăng nhập / Đăng ký.
      </p>

      {savedMsg && (
        <div className="auth-alert success" style={{ marginBottom: 16 }}>{savedMsg}</div>
      )}

      {/* Preview box */}
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Xem trước ảnh nền hiện tại:</label>
        <div style={{ height: 140, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-medium)', position: 'relative' }}>
          <img src={bgUrl} alt="Login background preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>

      {/* Paste URL */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Dán đường dẫn ảnh tùy chỉnh (URL):</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="https://example.com/image.jpg"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={() => inputUrl && handleSave(inputUrl)}>Lưu link</button>
        </div>
      </div>

      {/* Upload file */}
      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Hoặc Tải ảnh trực tiếp từ Máy tính:</label>
        <input type="file" accept="image/*" className="input" onChange={handleFileUpload} />
      </div>

      {/* Presets */}
      <div>
        <label className="form-label">Hoặc Chọn từ Bộ sưu tập mẫu có sẵn:</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
          {PRESET_WALLPAPERS.map(p => (
            <div
              key={p.name}
              style={{
                borderRadius: 10, overflow: 'hidden', border: bgUrl === p.url ? '2px solid #4285f4' : '1px solid var(--border-medium)',
                cursor: 'pointer', position: 'relative', height: 70
              }}
              onClick={() => handleSave(p.url)}
            >
              <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '3px 6px', fontWeight: 600, textAlign: 'center' }}>
                {p.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => handleSave(DEFAULT_BG)}>
          ↺ Khôi phục ảnh mặc định
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (newPw.length < 8) { setPwMsg('error:Mật khẩu phải ≥ 8 ký tự.'); return; }
    if (newPw !== confirmPw) { setPwMsg('error:Mật khẩu xác nhận không khớp.'); return; }
    setPwLoading(true);
    const { error } = await updatePassword(newPw);
    setPwMsg(error ? `error:${error.message}` : 'success:Đổi mật khẩu thành công!');
    setPwLoading(false);
    if (!error) { setNewPw(''); setConfirmPw(''); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'XOÁ TÀI KHOẢN') return;
    await deleteAccount();
    await signOut();
  };

  const [type, msg] = pwMsg.startsWith('error:')
    ? ['error', pwMsg.slice(6)]
    : pwMsg.startsWith('success:')
      ? ['success', pwMsg.slice(8)]
      : [null, ''];

  return (
    <div className="page-container">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">⚙️ Cài đặt tài khoản</h1>
            <p className="page-subtitle">Quản lý thông tin, ảnh nền và bảo mật tài khoản</p>
          </div>
        </div>

        {/* Account info */}
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 16 }}>👤 Thông tin tài khoản</h3>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" value={user?.email || 'demo@focusledger.app'} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Tên hiển thị</label>
            <input className="input" value={user?.user_metadata?.full_name || 'Demo User'} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            ℹ️ Thay đổi email và tên hiển thị thông qua provider đăng nhập (Google hoặc Supabase Dashboard).
          </p>
        </div>

        {/* Login Background Customization */}
        <LoginBgSection />

        {/* Change password */}
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 16 }}>🔒 Đổi mật khẩu</h3>
          {msg && (
            <div className={`auth-alert ${type}`} style={{ marginBottom: '16px' }}>{msg}</div>
          )}
          <form onSubmit={handleChangePw}>
            <div className="form-group">
              <label className="form-label">Mật khẩu mới</label>
              <input
                id="settings-new-pw"
                type="password"
                className="input"
                placeholder="••••••••"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu mới</label>
              <input
                id="settings-confirm-pw"
                type="password"
                className="input"
                placeholder="••••••••"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
              />
            </div>
            <button id="settings-change-pw" type="submit" className="btn btn-primary" disabled={pwLoading}>
              {pwLoading ? '⏳ Đang đổi...' : '🔒 Đổi mật khẩu'}
            </button>
          </form>
        </div>

        {/* Sign out */}
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 16 }}>🚪 Đăng xuất</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            Đăng xuất khỏi thiết bị này. Dữ liệu của bạn được lưu an toàn trên Supabase.
          </p>
          <button id="settings-signout" className="btn btn-ghost" onClick={signOut}>
            🚪 Đăng xuất
          </button>
        </div>

        {/* Danger zone */}
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
          <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 16, color: 'var(--danger)' }}>⚠️ Vùng nguy hiểm</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
            Xoá tài khoản sẽ xoá vĩnh viễn toàn bộ dữ liệu (mục tiêu, task, lịch sử). <strong style={{ color: 'var(--danger)' }}>Hành động này KHÔNG thể hoàn tác.</strong>
          </p>

          {!showDeleteConfirm ? (
            <button
              id="settings-delete-account"
              className="btn btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              🗑️ Xoá tài khoản
            </button>
          ) : (
            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>
                Nhập chính xác "XOÁ TÀI KHOẢN" để xác nhận:
              </p>
              <input
                className="input"
                placeholder="XOÁ TÀI KHOẢN"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-danger btn-sm"
                  disabled={deleteConfirm !== 'XOÁ TÀI KHOẢN'}
                  onClick={handleDeleteAccount}
                >
                  Đồng ý xoá vĩnh viễn
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteConfirm(false)}>
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
