import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO, differenceInSeconds, differenceInDays } from 'date-fns';
import { getAllGoals } from '../../api/goals';
import { DEMO_CATEGORIES } from '../../api/goals';
import '../../styles/visualization.css';

function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatTimeDisplay({ days, hours, minutes, seconds }) {
  if (days > 0) return `${days}n ${pad(hours)}h ${pad(minutes)}p`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function useCountdown(deadline) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!deadline) return;
    const target = new Date(deadline).getTime();
    const update = () => {
      const diff = Math.floor((target - Date.now()) / 1000);
      setTimeLeft(Math.max(0, diff));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return timeLeft;
}

function PinnedClock({ goal, categories }) {
  const cat = categories.find(c => c.id === goal.category_id);
  const totalSeconds = useCountdown(goal.deadline);
  const countdown = formatCountdown(totalSeconds);
  const isUrgent = totalSeconds > 0 && totalSeconds < 86400;
  const isPast = totalSeconds <= 0;

  return (
    <div className={`pinned-clock ${isUrgent ? 'urgent' : ''}`}>
      <div
        className="pinned-clock-category"
        style={{ background: `${cat?.color || '#6366f1'}20`, color: cat?.color || '#6366f1' }}
      >
        <span>{cat?.icon || '🎯'}</span>
        {cat?.name || 'Mục tiêu'}
      </div>

      <div className="pinned-clock-goal">{goal.title}</div>

      <div className="pinned-clock-time">
        {isPast
          ? '⚠️ Hết hạn'
          : `${countdown.days > 0 ? `${countdown.days}n ` : ''}${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`
        }
      </div>

      <div className="pinned-clock-units">
        {countdown.days > 0 && <span>Ngày</span>}
        <span>Giờ</span>
        <span>Phút</span>
        <span>Giây</span>
      </div>

      {goal.deadline && (
        <div className="pinned-clock-deadline">
          {isPast ? '⚠️ Đã qua hạn' : isUrgent ? '🔴 Còn dưới 24 giờ!' : `📅 Deadline: ${format(parseISO(goal.deadline), 'dd/MM/yyyy HH:mm')}`}
        </div>
      )}
    </div>
  );
}

function ClockCard({ goal, categories, isPinned, onPin }) {
  const cat = categories.find(c => c.id === goal.category_id);
  const totalSeconds = useCountdown(goal.deadline);
  const countdown = formatCountdown(totalSeconds);
  const isUrgent = totalSeconds > 0 && totalSeconds < 86400;
  const isPast = totalSeconds <= 0;

  return (
    <div
      className={`clock-card ${isUrgent ? 'urgent' : ''} ${isPinned ? 'pinned' : ''}`}
      id={`clock-card-${goal.id}`}
      onClick={onPin}
    >
      <div className="clock-card-header">
        <span
          className="color-dot"
          style={{ background: cat?.color || '#6366f1', width: 10, height: 10 }}
        />
        <span className="clock-card-title">{goal.title}</span>
        {isPinned && <span title="Đang ghim" style={{ fontSize: 14 }}>📌</span>}
      </div>

      <div className="clock-card-time">
        {isPast
          ? '⚠️'
          : countdown.days > 0
            ? `${countdown.days}n ${pad(countdown.hours)}h`
            : `${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`
        }
      </div>

      <div className="clock-card-deadline">
        {isPast
          ? '⚠️ Đã hết hạn'
          : `📅 ${format(parseISO(goal.deadline), 'dd/MM/yyyy')}`
        }
      </div>
    </div>
  );
}

export default function CountdownPage() {
  const [goals, setGoals] = useState([]);
  const [categories] = useState(DEMO_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [pinnedId, setPinnedId] = useState(null);

  useEffect(() => {
    getAllGoals().then(({ data }) => {
      const withDeadline = (data || []).filter(g => g.deadline);
      setGoals(withDeadline);
      // Auto-pin the most urgent goal
      if (withDeadline.length > 0) {
        const sorted = [...withDeadline].sort((a, b) =>
          new Date(a.deadline) - new Date(b.deadline)
        );
        setPinnedId(sorted[0].id);
      }
      setLoading(false);
    });
  }, []);

  const pinnedGoal = goals.find(g => g.id === pinnedId) || goals[0];
  const otherGoals = goals.filter(g => g.id !== pinnedGoal?.id);

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">⏳ Countdown</h1>
            <p className="page-subtitle">Theo dõi deadline các mục tiêu quan trọng theo thời gian thực</p>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">⏰</div>
          <div className="empty-state-title">Chưa có deadline nào</div>
          <div className="empty-state-desc">
            Thêm deadline cho các mục tiêu của bạn trong tab "Mục tiêu" để xem đồng hồ đếm ngược tại đây.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="countdown-page">
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title">⏳ Countdown</h1>
            <p className="page-subtitle">
              {goals.length} deadline đang theo dõi · Bấm vào đồng hồ bất kỳ để ghim lên đầu
            </p>
          </div>
        </div>

        {/* Pinned clock */}
        {pinnedGoal && (
          <PinnedClock
            goal={pinnedGoal}
            categories={categories}
          />
        )}

        {/* Grid of other clocks */}
        {otherGoals.length > 0 && (
          <>
            <h3 style={{ font: '600 14px var(--font-sans)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 'var(--space-4)' }}>
              Các deadline khác
            </h3>
            <div className="clock-grid">
              {otherGoals.map(goal => (
                <ClockCard
                  key={goal.id}
                  goal={goal}
                  categories={categories}
                  isPinned={goal.id === pinnedId}
                  onPin={() => setPinnedId(goal.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
