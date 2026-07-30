import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/layout.css';

const NAV_ITEMS = [
  { key: 'goals',         icon: '🎯', label: 'Mục tiêu' },
  { key: 'countdown',     icon: '⏳', label: 'Countdown' },
  { key: 'visualization', icon: '📊', label: 'Visualization' },
];

const GOAL_TABS = [
  { key: 'day',   label: '📅 Ngày' },
  { key: 'week',  label: '📆 Tuần' },
  { key: 'month', label: '🗓️ Tháng' },
  { key: 'year',  label: '🏆 Năm' },
];

const PAGE_TITLES = {
  goals:         'Mục tiêu',
  countdown:     'Countdown',
  visualization: 'Visualization',
  settings:      'Cài đặt tài khoản',
};

export default function AppLayout({ children, currentPage, onNavigate, goalView, onGoalView }) {
  const { user, signOut, isDemoMode } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const avatarLetter = user?.email?.[0]?.toUpperCase() || 'U';
  const displayName  = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="app-layout">

      {/* ── Slim icon sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo" onClick={() => onNavigate('goals')} title="Focus Ledger">
          ⚡
        </div>

        {/* Nav items */}
        {NAV_ITEMS.map(({ key, icon, label }) => (
          <button
            key={key}
            id={`nav-${key}`}
            className={`nav-item ${currentPage === key ? 'active' : ''}`}
            data-label={label}
            onClick={() => onNavigate(key)}
            title={label}
          >
            <span className="nav-icon">{icon}</span>
          </button>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Settings */}
        <button
          id="nav-settings"
          className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
          data-label="Cài đặt"
          onClick={() => onNavigate('settings')}
          title="Cài đặt"
        >
          <span className="nav-icon">⚙️</span>
        </button>

        {/* Account */}
        <div className="sidebar-footer">
          <div className="dropdown" ref={dropdownRef}>
            <div
              id="account-menu-trigger"
              className="user-badge"
              onClick={() => setAccountOpen(o => !o)}
              title={user?.email}
            >
              <div className="user-avatar">{avatarLetter}</div>
            </div>

            {accountOpen && (
              <div className="dropdown-menu" style={{ bottom: 0, top: 'auto' }}>
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: '2px' }}>{user?.email}</div>
                  {isDemoMode && <div style={{ fontSize: 10, color: 'var(--accent-primary)', marginTop: 4, fontWeight: 600 }}>🧪 Demo Mode</div>}
                </div>
                <button id="account-settings" className="dropdown-item" onClick={() => { onNavigate('settings'); setAccountOpen(false); }}>
                  ⚙️ Cài đặt tài khoản
                </button>
                <div className="dropdown-divider" />
                <button id="account-signout" className="dropdown-item danger" onClick={async () => { await signOut(); setAccountOpen(false); }}>
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        {/* Top bar */}
        <div className="topbar">
          <div className="topbar-breadcrumb">
            <span>Focus Ledger</span>
            <span style={{ opacity: 0.4 }}>/</span>
            <strong>{PAGE_TITLES[currentPage] || 'Mục tiêu'}</strong>
          </div>

          {/* Goal sub-tabs (only when on Goals page) */}
          {currentPage === 'goals' && (
            <div className="goal-tabs">
              {GOAL_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  id={`goal-tab-${key}`}
                  className={`goal-tab ${goalView === key ? 'active' : ''}`}
                  onClick={() => onGoalView(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Page content */}
        {children}
      </main>
    </div>
  );
}
