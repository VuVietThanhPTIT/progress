import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, addDays, subDays, startOfWeek, isToday, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getTasksByDate, toggleTaskComplete, createTask, updateTask, deleteTask } from '../../api/tasks';
import { getCategories, getAllGoals, DEMO_CATEGORIES } from '../../api/goals';
import GoalView from './GoalView';
import '../../styles/timeline.css';

const HOUR_HEIGHT = 56; // px per hour slot
const START_HOUR = 6;   // 06:00 AM
const END_HOUR = 23;    // 23:00 PM

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

// ─── Task Form Modal ─────────────────────────────────────────────────────────
function TaskFormModal({ onClose, onSave, defaultDate, defaultTime, categories, goals, editTask }) {
  const [form, setForm] = useState({
    title: editTask?.title || '',
    description: editTask?.description || '',
    start_time: editTask?.start_time || defaultTime || '09:00',
    duration_minutes: editTask?.duration_minutes || 60,
    category_id: editTask?.category_id || (categories[0]?.id || ''),
    goal_id: editTask?.goal_id || '',
    date: editTask?.date || defaultDate || format(new Date(), 'yyyy-MM-dd'),
    recurrence: editTask?.recurrence || 'none',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Vui lòng nhập tên công việc.'); return; }
    setLoading(true);
    setError('');
    const res = await onSave({
      ...form,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : 60,
    });
    setLoading(false);
    if (res?.error) {
      setError(typeof res.error === 'string' ? res.error : res.error?.message || 'Không thể lưu công việc.');
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 className="modal-title">{editTask ? '✏️ Sửa công việc' : '➕ Thêm công việc mới'}</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div className="auth-alert error" style={{ marginBottom: 16 }}>{String(error)}</div>}

        <div className="form-group">
          <label className="form-label">Tên công việc *</label>
          <input
            className="input"
            placeholder="VD: Học Tiếng Anh, Tập Gym..."
            value={form.title}
            onChange={e => set('title', e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Ngày thực hiện</label>
          <input
            type="date"
            className="input"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Giờ bắt đầu</label>
            <input
              type="time"
              className="input"
              value={form.start_time}
              onChange={e => set('start_time', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Thời lượng (phút)</label>
            <input
              type="number"
              className="input"
              placeholder="60"
              min="5"
              step="5"
              value={form.duration_minutes}
              onChange={e => set('duration_minutes', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Danh mục</label>
          <select
            className="input"
            value={form.category_id}
            onChange={e => set('category_id', e.target.value)}
          >
            <option value="">— Chọn danh mục —</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Gắn vào Mục tiêu Tuần (tùy chọn)</label>
          <select
            className="input"
            value={form.goal_id}
            onChange={e => set('goal_id', e.target.value)}
          >
            <option value="">— Không gắn —</option>
            {goals.map(g => (
              <option key={g.id} value={g.id}>[{g.type.toUpperCase()}] {g.title}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">🔁 Lặp lại công việc</label>
          <select
            className="input"
            value={form.recurrence || 'none'}
            onChange={e => set('recurrence', e.target.value)}
          >
            <option value="none">🚫 Không lặp lại</option>
            <option value="daily">🔁 Lặp Hàng ngày</option>
            <option value="weekly">📅 Lặp Hàng tuần</option>
            <option value="monthly">🗓️ Lặp Hàng tháng</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? '⏳ Đang lưu...' : (editTask ? 'Cập nhật' : '➕ Thêm công việc')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main 7-Day Google Calendar Week View ─────────────────────────────────────
export default function WeekCalendarView() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weekTasks, setWeekTasks] = useState([]);
  const [categories, setCategories] = useState(DEMO_CATEGORIES);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subMode, setSubMode] = useState('calendar'); // 'calendar' | 'okr'
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({ date: null, time: null });
  const [editTask, setEditTask] = useState(null);
  const [nowTop, setNowTop] = useState(0);

  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Fetch tasks for all 7 days in the week
  const fetchWeekTasks = useCallback(async () => {
    setLoading(true);
    const promises = daysOfWeek.map(d => getTasksByDate(d));
    const results = await Promise.all(promises);
    const allTasks = [];
    results.forEach((res, idx) => {
      if (res.data) {
        const dateStr = format(daysOfWeek[idx], 'yyyy-MM-dd');
        res.data.forEach(t => {
          allTasks.push({ ...t, _viewDate: dateStr });
        });
      }
    });
    setWeekTasks(allTasks);
    setLoading(false);
  }, [currentWeekStart]);

  useEffect(() => {
    fetchWeekTasks();
  }, [fetchWeekTasks]);

  useEffect(() => {
    getCategories().then(({ data }) => data && setCategories(data));
    getAllGoals().then(({ data }) => data && setGoals(data));
  }, []);

  // Update current time line indicator
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      if (mins >= START_HOUR * 60 && mins <= END_HOUR * 60) {
        setNowTop(((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT);
      } else {
        setNowTop(-1);
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveTask = async (formData) => {
    let res;
    if (editTask) {
      res = await updateTask(editTask.id, formData);
    } else {
      res = await createTask(formData);
    }
    if (!res?.error) {
      await fetchWeekTasks();
    }
    setEditTask(null);
    return res;
  };

  const handleToggleComplete = async (task) => {
    await toggleTaskComplete(task.id);
    await fetchWeekTasks();
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa công việc này?')) return;
    await deleteTask(id);
    await fetchWeekTasks();
  };

  const hoursArray = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  if (subMode === 'okr') {
    return (
      <div className="page-container">
        <div style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setSubMode('calendar')}>
            ← Quay lại Lịch 7 Ngày Google Calendar
          </button>
        </div>
        <GoalView type="week" />
      </div>
    );
  }

  const weekTitle = `${format(currentWeekStart, 'dd/MM')} - ${format(addDays(currentWeekStart, 6), 'dd/MM/yyyy')}`;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* ── Google Calendar Bar Header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border-medium)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        
        {/* Navigation & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentWeekStart(w => subWeeks(w, 1))}>‹ Tuần trước</button>
          <button className="btn btn-primary btn-sm" style={{ background: '#4285f4', color: '#fff', borderRadius: 16 }} onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Hôm nay
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentWeekStart(w => addWeeks(w, 1))}>Tuần sau ›</button>
          
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, marginLeft: 8 }}>
            📅 Tuần {format(currentWeekStart, 'w')}: {weekTitle}
          </h2>
        </div>

        {/* Mode Switcher & Add Task */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 20, padding: 3, display: 'flex', border: '1px solid var(--border-subtle)' }}>
            <button
              className={`btn btn-sm ${subMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 16, padding: '4px 14px', fontSize: 12, background: subMode === 'calendar' ? '#4285f4' : 'transparent', color: subMode === 'calendar' ? '#fff' : 'var(--text-primary)' }}
              onClick={() => setSubMode('calendar')}
            >
              📆 Lịch 7 Ngày (Google Calendar)
            </button>
            <button
              className={`btn btn-sm ${subMode === 'okr' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 16, padding: '4px 14px', fontSize: 12, background: subMode === 'okr' ? '#5b6ec7' : 'transparent', color: subMode === 'okr' ? '#fff' : 'var(--text-primary)' }}
              onClick={() => setSubMode('okr')}
            >
              🎯 OKR Mục tiêu Tuần
            </button>
          </div>

          <button
            className="btn btn-primary btn-sm"
            style={{ background: '#4285f4', borderRadius: 20, padding: '6px 16px', fontWeight: 700 }}
            onClick={() => {
              setEditTask(null);
              setSelectedSlot({ date: format(new Date(), 'yyyy-MM-dd'), time: '09:00' });
              setShowModal(true);
            }}
          >
            + Thêm task
          </button>
        </div>
      </div>

      {/* ── 7-Day Grid Body ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8f9fa' }}>
        
        {/* Header Row: 7 Days Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', background: '#fff', borderBottom: '1px solid var(--border-medium)', paddingRight: 8 }}>
          <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
            GIỜ
          </div>
          {daysOfWeek.map((day, idx) => {
            const today = isToday(day);
            const dayName = format(day, 'EEEE', { locale: vi });
            const dayNum = format(day, 'd');
            return (
              <div
                key={idx}
                style={{
                  padding: '10px 4px', textCenter: 'center', textAlign: 'center',
                  borderLeft: '1px solid var(--border-subtle)',
                  background: today ? '#e8f0fe' : 'transparent',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: today ? '#1a73e8' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {dayName.replace('Thứ ', 'T')}
                </div>
                <div
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: '50%', marginTop: 2,
                    fontWeight: 800, fontSize: 14,
                    background: today ? '#1a73e8' : 'transparent',
                    color: today ? '#fff' : 'var(--text-primary)'
                  }}
                >
                  {dayNum}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Time Grid */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minHeight: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT, position: 'relative' }}>
            
            {/* Time labels column */}
            <div style={{ background: '#fff', borderRight: '1px solid var(--border-subtle)' }}>
              {hoursArray.map(h => (
                <div
                  key={h}
                  style={{
                    height: HOUR_HEIGHT, borderBottom: '1px solid var(--border-subtle)',
                    padding: '4px 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right'
                  }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* 7 Columns for Days */}
            {daysOfWeek.map((day, dayIdx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const today = isToday(day);
              const dayTasks = weekTasks.filter(t => t._viewDate === dateStr);

              return (
                <div
                  key={dayIdx}
                  style={{
                    position: 'relative', borderLeft: '1px solid var(--border-subtle)',
                    background: today ? 'rgba(66, 133, 244, 0.02)' : '#fff'
                  }}
                >
                  {/* Hour slots lines */}
                  {hoursArray.map(h => (
                    <div
                      key={h}
                      style={{ height: HOUR_HEIGHT, borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedSlot({ date: dateStr, time: `${String(h).padStart(2, '0')}:00` });
                        setEditTask(null);
                        setShowModal(true);
                      }}
                    />
                  ))}

                  {/* Red Current Time Line (Only on Today column) */}
                  {today && nowTop >= 0 && (
                    <div
                      style={{
                        position: 'absolute', top: nowTop, left: 0, right: 0, height: 2,
                        background: '#ea4335', zIndex: 10, pointerEvents: 'none'
                      }}
                    >
                      <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#ea4335' }} />
                    </div>
                  )}

                  {/* Render Task Cards on Grid */}
                  {dayTasks.map(task => {
                    const startMins = timeToMinutes(task.start_time) || (9 * 60);
                    const relMins = Math.max(0, startMins - START_HOUR * 60);
                    const top = (relMins / 60) * HOUR_HEIGHT;
                    const dur = task.duration_minutes || 60;
                    const height = Math.max(28, (dur / 60) * HOUR_HEIGHT);

                    const cat = categories.find(c => c.id === task.category_id);
                    const bgColor = cat?.color || '#4285f4';

                    return (
                      <div
                        key={task.id}
                        style={{
                          position: 'absolute', top, left: 2, right: 2, height: height - 2,
                          background: task.is_completed ? '#e0e0e0' : bgColor,
                          color: task.is_completed ? '#757575' : '#fff',
                          borderRadius: 6, padding: '4px 6px', fontSize: 11, fontWeight: 700,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)', cursor: 'pointer',
                          overflow: 'hidden', borderLeft: `4px solid ${bgColor}`,
                          textDecoration: task.is_completed ? 'line-through' : 'none',
                          zIndex: 5, transition: 'transform 0.15s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditTask(task);
                          setShowModal(true);
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.is_completed ? '✓ ' : ''}{task.title}
                          </span>
                          <button
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 10, opacity: 0.8 }}
                            onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                          >
                            {task.is_completed ? '↩' : '✓'}
                          </button>
                        </div>
                        {height > 36 && (
                          <div style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}>
                            ⏰ {task.start_time} ({dur}p)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      {showModal && (
        <TaskFormModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveTask}
          defaultDate={selectedSlot.date}
          defaultTime={selectedSlot.time}
          categories={categories}
          goals={goals}
          editTask={editTask}
        />
      )}
    </div>
  );
}
