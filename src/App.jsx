import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import ForgotPassword from './components/auth/ForgotPassword';
import DayView from './components/goals/DayView';
import WeekCalendarView from './components/goals/WeekCalendarView';
import GoalView from './components/goals/GoalView';
import CountdownPage from './components/countdown/CountdownPage';
import VisPage from './components/visualization/VisPage';
import SettingsPage from './components/settings/SettingsPage';
import './styles/index.css';

// ─── Auth Gate ───────────────────────────────────────────────────────────────
function AuthGate() {
  const [authScreen, setAuthScreen] = useState('signin'); // signin | signup | forgot

  const screens = {
    signin: <SignIn onSwitch={setAuthScreen} />,
    signup: <SignUp onSwitch={setAuthScreen} />,
    forgot: <ForgotPassword onSwitch={setAuthScreen} />,
  };

  return screens[authScreen] || screens.signin;
}

// ─── Main App Content (authenticated) ────────────────────────────────────────
function AppContent() {
  const { user, loading, isDemoMode } = useAuth();
  const [currentPage, setCurrentPage] = useState('goals');
  const [goalView, setGoalView] = useState('day');

  // Loading screen
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">⚡ Focus Ledger</div>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <AuthGate />;
  }

  // Authenticated — render main app
  const renderPage = () => {
    switch (currentPage) {
      case 'goals':
        switch (goalView) {
          case 'day': return <DayView />;
          case 'week': return <WeekCalendarView />;
          case 'month': return <GoalView type="month" />;
          case 'year': return <GoalView type="year" />;
          default: return <DayView />;
        }
      case 'countdown':
        return <CountdownPage />;
      case 'visualization':
        return <VisPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DayView />;
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={(page) => setCurrentPage(page)}
      goalView={goalView}
      onGoalView={(view) => {
        setGoalView(view);
        setCurrentPage('goals');
      }}
    >
      {renderPage()}
    </AppLayout>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
