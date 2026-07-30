import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getTasksByDate, getOverdueTasks, rolloverTask, toggleTaskComplete, createTask, updateTask, deleteTask } from '../../api/tasks';
import { getCategories, getAllGoals } from '../../api/goals';
import { DEMO_CATEGORIES } from '../../api/goals';
import '../../styles/timeline.css';

const HOUR_HEIGHT = 72; // px per hour, matches CSS var
const START_HOUR = 6; // Timeline starts at 06:00 AM

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToPx(minutes) {
  const relMins = Math.max(0, minutes - START_HOUR * 60);
  return (relMins / 60) * HOUR_HEIGHT;
}

// ─── Task Form Modal ─────────────────────────────────────────────────────────
function TaskFormModal({ onClose, onSave, date, categories, goals, editTask }) {
  const [form, setForm] = useState({
    title: editTask?.title || '',
    description: editTask?.description || '',
    start_time: editTask?.start_time || '',
    duration_minutes: editTask?.duration_minutes || '',
    category_id: editTask?.category_id || (categories[0]?.id || ''),
    goal_id: editTask?.goal_id || '',
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
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      date: format(date, 'yyyy-MM-dd'),
    });
    setLoading(false);
    if (res?.error) {
      const msg = typeof res.error === 'string' ? res.error : res.error?.message || 'Không thể lưu công việc.';
      setError(msg);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 className="modal-title">{editTask ? '✏️ Sửa công việc' : '➕ Thêm công việc'}</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div className="auth-alert error" style={{ marginBottom: '16px' }}>{String(error)}</div>}

        <div className="form-group">
          <label className="form-label">Tên công việc *</label>
          <input
            id="task-form-title"
            className="input"
            placeholder="VD: Đọc tài liệu React..."
            value={form.title}
            onChange={e => set('title', e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Mô tả / Ghi chú</label>
          <textarea
            id="task-form-desc"
            className="input"
            placeholder="Chi tiết, liên kết, ghi chú..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Giờ bắt đầu</label>
            <input
              id="task-form-time"
              type="time"
              className="input"
              value={form.start_time}
              onChange={e => set('start_time', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Thời lượng (phút)</label>
            <input
              id="task-form-duration"
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
            id="task-form-category"
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
          <label className="form-label">Gắn vào Mục tiêu (tùy chọn)</label>
          <select
            id="task-form-goal"
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

        {/* Lặp lại công việc (Recurrence) */}
        <div className="form-group">
          <label className="form-label">🔁 Tùy chọn Lặp lại công việc</label>
          <select
            id="task-form-recurrence"
            className="input"
            value={form.recurrence || 'none'}
            onChange={e => set('recurrence', e.target.value)}
            style={{ fontWeight: 600, color: form.recurrence && form.recurrence !== 'none' ? 'var(--accent-primary)' : 'inherit' }}
          >
            <option value="none">🚫 Không lặp lại (Chỉ ngày này)</option>
            <option value="daily">🔁 Lặp Hàng ngày (Tất cả các ngày)</option>
            <option value="weekly">📅 Lặp Hàng tuần (Mỗi tuần cùng thứ)</option>
            <option value="monthly">🗓️ Lặp Hàng tháng (Mỗi tháng cùng ngày)</option>
            <option value="yearly">🏆 Lặp Hàng năm (Mỗi năm cùng ngày)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Huỷ</button>
          <button id="task-form-save" className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? '⏳ Đang lưu...' : editTask ? '💾 Lưu thay đổi' : '➕ Thêm công việc'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Focus Mode Modal ────────────────────────────────────────────────────────
function FocusMode({ task, category, goal, onClose, onToggle, onEdit, onDelete }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="focus-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="focus-badge">🎯 CHẾ ĐỘ FOCUS — CHỈ TẬP TRUNG 1 VIỆC</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="focus-title">{task.title}</div>
        {task.description && <div className="focus-desc">{task.description}</div>}

        <div className="focus-meta">
          {category && (
            <span className="badge" style={{ background: `${category.color}15`, color: category.color, padding: '4px 12px', fontSize: 12 }}>
              <span className="color-dot" style={{ background: category.color }} />
              {category.icon} {category.name}
            </span>
          )}
          {goal && (
            <span className="badge badge-accent" style={{ padding: '4px 12px', fontSize: 12 }}>
              🎯 {goal.title}
            </span>
          )}
          {task.start_time && (
            <span className="badge badge-muted" style={{ padding: '4px 12px', fontSize: 12 }}>
              ⏰ {task.start_time} ({task.duration_minutes || 30}p)
            </span>
          )}
          {task.rollover_count > 0 && (
            <span className="badge badge-warning" style={{ padding: '4px 12px', fontSize: 12 }}>
              ↷ Bị dời {task.rollover_count} lần
            </span>
          )}
          {task.recurrence && task.recurrence !== 'none' && (
            <span className="badge badge-accent" style={{ padding: '4px 12px', fontSize: 12, background: 'var(--accent-light)', color: 'var(--accent-primary)' }}>
              {task.recurrence === 'daily' && '🔁 Lặp hàng ngày'}
              {task.recurrence === 'weekly' && '📅 Lặp hàng tuần'}
              {task.recurrence === 'monthly' && '🗓️ Lặp hàng tháng'}
              {task.recurrence === 'yearly' && '🏆 Lặp hàng năm'}
            </span>
          )}
          {task.is_completed && <span className="badge badge-success">✓ Hoàn thành</span>}
        </div>

        <div className="focus-actions">
          <button
            id="focus-complete-btn"
            className={`focus-complete-btn ${task.is_completed ? 'done' : ''}`}
            onClick={() => onToggle(task.id)}
          >
            {task.is_completed ? '✓ Đã hoàn thành' : '○ Đánh dấu hoàn thành'}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(task)}>✏️ Sửa</button>
            <button className="btn btn-danger btn-sm" onClick={() => { onDelete(task.id); onClose(); }}>🗑️</button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main DayView ─────────────────────────────────────────────────────────────
export default function DayView() {
  const [date, setDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [categories, setCategories] = useState(DEMO_CATEGORIES);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nowPos, setNowPos] = useState(0);
  const [focusTask, setFocusTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // timeline | checklist
  const scrollRef = useRef(null);

  // Fetch data
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const [{ data: dateTasks }, { data: pastOverdue }] = await Promise.all([
      getTasksByDate(date),
      getOverdueTasks(),
    ]);
    setTasks(dateTasks || []);
    setOverdueTasks(pastOverdue || []);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    getCategories().then(({ data }) => data && setCategories(data));
    getAllGoals().then(({ data }) => data && setGoals(data));
  }, []);

  // Current time line
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      setNowPos(minutesToPx(mins));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on load (timeline view)
  useEffect(() => {
    if (viewMode === 'timeline' && scrollRef.current && isToday(date)) {
      const scrollTo = Math.max(0, nowPos - 200);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [nowPos, date, viewMode]);

  // Toggle task
  const handleToggle = async (id) => {
    const res = await toggleTaskComplete(id);
    if (!res?.error) {
      await fetchTasks();
      if (focusTask?.id === id) setFocusTask(t => ({ ...t, is_completed: !t.is_completed }));
    }
  };

  // Rollover task to today
  const handleRolloverToToday = async (taskId) => {
    const res = await rolloverTask(taskId, date);
    if (!res?.error) {
      await fetchTasks();
    }
  };

  // Save task
  const handleSave = async (formData) => {
    let res;
    if (editTask) {
      res = await updateTask(editTask.id, formData);
    } else {
      res = await createTask(formData);
    }
    if (!res?.error) {
      await fetchTasks();
    }
    setEditTask(null);
    return res;
  };

  // Delete task
  const handleDelete = async (id) => {
    const res = await deleteTask(id);
    if (!res?.error) {
      await fetchTasks();
    }
  };

  const timedTasks = tasks.filter(t => t.start_time);
  const floatingTasks = tasks.filter(t => !t.start_time);

  const getCat = (id) => categories.find(c => c.id === id);
  const getGoal = (id) => goals.find(g => g.id === id);

  const completedCount = tasks.filter(t => t.is_completed).length;
  const totalCount = tasks.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const weekday = format(date, 'EEEE', { locale: vi });
  const fullDate = format(date, 'dd/MM/yyyy');

  return (
    <div className="day-view-root">
      {/* ── Header ── */}
      <div className="day-header">
        <button className="day-nav-btn" id="day-prev" onClick={() => setDate(d => subDays(d, 1))}>‹</button>

        <div className="day-date-display">
          <div className="day-weekday" style={{ textTransform: 'capitalize' }}>{weekday}</div>
          <div className="day-full-date">
            {fullDate}
            {isToday(date) && <span className="day-today-badge">Hôm nay</span>}
          </div>
        </div>

        <button className="day-nav-btn" id="day-next" onClick={() => setDate(d => addDays(d, 1))}>›</button>

        {!isToday(date) && (
          <button
            id="day-today"
            className="btn btn-ghost btn-sm"
            onClick={() => setDate(new Date())}
            style={{ marginLeft: '8px' }}
          >
            Hôm nay
          </button>
        )}

        {/* View Switcher: Timeline vs Checklist */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 3, border: '1px solid var(--border-subtle)', marginLeft: 12 }}>
          <button
            id="view-mode-timeline"
            className={`btn btn-sm ${viewMode === 'timeline' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 6, padding: '4px 12px', fontSize: 12 }}
            onClick={() => setViewMode('timeline')}
          >
            📊 Timeline (6h - 23h)
          </button>
          <button
            id="view-mode-checklist"
            className={`btn btn-sm ${viewMode === 'checklist' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 6, padding: '4px 12px', fontSize: 12 }}
            onClick={() => setViewMode('checklist')}
          >
            ✅ Checklist
          </button>
        </div>

        <div className="day-stats">
          <div className="day-stat">
            <div className="day-stat-value" style={{ color: pct === 100 ? 'var(--success)' : 'var(--text-primary)' }}>
              {completedCount}/{totalCount}
            </div>
            <div className="day-stat-label">Hoàn thành</div>
          </div>
          <div className="day-stat">
            <div className="day-stat-value" style={{ color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
              {pct}%
            </div>
            <div className="day-stat-label">Tiến độ</div>
          </div>
        </div>

        <button
          id="add-task-header"
          className="btn btn-primary btn-sm"
          onClick={() => { setEditTask(null); setShowForm(true); }}
        >
          + Thêm task
        </button>
      </div>

      {/* ── Overdue / Backlog Banner Section ── */}
      {isToday(date) && overdueTasks.length > 0 && (
        <div style={{
          margin: '12px 32px 0', padding: '14px 18px', background: '#fff',
          border: '1.5px solid rgba(200,132,42,0.3)', borderRadius: '12px',
          boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: 'var(--amber)' }}>
              <span>⚠️ Task tồn đọng từ hôm trước ({overdueTasks.length})</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Bấm <strong>➡️ Dời sang hôm nay</strong> để chuyển vào lịch ngày {fullDate}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {overdueTasks.map(ot => {
              const cat = getCat(ot.category_id);
              return (
                <div key={ot.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-medium)',
                  borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ot.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2, alignItems: 'center' }}>
                      {cat && (
                        <span className="badge" style={{ background: `${cat.color}15`, color: cat.color, fontSize: 10, padding: '1px 6px' }}>
                          {cat.name}
                        </span>
                      )}
                      <span>📅 Ngày cũ: {ot.date}</span>
                      {ot.rollover_count > 0 && <span style={{ color: 'var(--warning)', fontWeight: 700 }}>· ↷ Dời {ot.rollover_count} lần</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ background: 'var(--accent-primary)', fontSize: 11, padding: '4px 10px' }}
                      onClick={() => handleRolloverToToday(ot.id)}
                    >
                      ➡️ Dời sang hôm nay
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => handleToggle(ot.id)}
                    >
                      ✓ Xong luôn
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main View Area ── */}
      <div className="day-content">
        {viewMode === 'timeline' ? (
          /* ── Timeline View (06:00 đến 23:00) ── */
          <div className="timeline-scroll-area" ref={scrollRef}>
            <div className="timeline-grid">
              <div className="timeline-hours">
                {Array.from({ length: 18 }, (_, i) => {
                  const h = START_HOUR + i;
                  return (
                    <div
                      key={h}
                      className="hour-label"
                      style={{ top: `${minutesToPx(h * 60) + 16}px` }}
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  );
                })}
              </div>

              <div className="timeline-lanes" style={{ marginRight: 'var(--space-8)' }}>
                {Array.from({ length: 18 }, (_, i) => {
                  const h = START_HOUR + i;
                  return (
                    <div
                      key={h}
                      className="hour-line"
                      style={{ top: `${minutesToPx(h * 60) + 16}px` }}
                    />
                  );
                })}

                {isToday(date) && (
                  <div className="now-line" style={{ top: `${nowPos + 16}px` }} />
                )}

                {timedTasks.map(task => {
                  const cat = getCat(task.category_id);
                  const goal = getGoal(task.goal_id);
                  const startMins = timeToMinutes(task.start_time);
                  const durMins = task.duration_minutes || 30;
                  const top = minutesToPx(startMins) + 16;
                  const height = Math.max(minutesToPx(durMins), 28);
                  const bgColor = cat?.color || '#2d5c3e';
                  const isRolloverWarn = task.rollover_count >= 3;

                  return (
                    <div
                      key={task.id}
                      className={`task-block ${task.is_completed ? 'completed' : ''}`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        background: `${bgColor}18`,
                        borderColor: `${bgColor}40`,
                        borderLeft: `4px solid ${bgColor}`,
                      }}
                      id={`task-block-${task.id}`}
                      onClick={() => setFocusTask(task)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div className="task-block-title" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {task.is_completed && '✓ '}
                          {task.title}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isRolloverWarn && (
                            <span className="badge badge-danger" style={{ fontSize: '10px' }} title={`Task bị trì hoãn ${task.rollover_count} lần`}>
                              ⚠️ ↷×{task.rollover_count}
                            </span>
                          )}
                          <span className="task-block-time" style={{ color: 'var(--text-muted)' }}>
                            {task.start_time} ({durMins}p)
                          </span>
                        </div>
                      </div>

                      {goal && (
                        <div className="task-block-goal" style={{ color: 'var(--accent-primary)', fontSize: 11 }}>
                          🎯 {goal.title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Floating tasks */}
            {(floatingTasks.length > 0 || true) && (
              <div className="floating-tasks">
                <div className="floating-tasks-header">
                  📌 Việc không cố định giờ ({floatingTasks.length})
                </div>

                {floatingTasks.map(task => {
                  const cat = getCat(task.category_id);
                  return (
                    <div
                      key={task.id}
                      className={`floating-task-item ${task.is_completed ? 'completed' : ''}`}
                      id={`floating-task-${task.id}`}
                      onClick={() => setFocusTask(task)}
                    >
                      <div
                        className={`checkbox ${task.is_completed ? 'checked' : ''}`}
                        onClick={e => { e.stopPropagation(); handleToggle(task.id); }}
                      />
                      <div className="floating-task-title">{task.title}</div>
                      {cat && (
                        <span className="color-dot" style={{ background: cat.color }} />
                      )}
                      {task.rollover_count > 0 && (
                        <span className={`badge ${task.rollover_count >= 3 ? 'badge-danger' : 'badge-warning'} badge-sm`}
                          style={{ fontSize: '10px', padding: '1px 6px' }}>
                          ↷×{task.rollover_count}
                        </span>
                      )}
                    </div>
                  );
                })}

                <button
                  id="add-floating-task"
                  className="add-task-btn"
                  style={{ marginTop: '8px' }}
                  onClick={() => { setEditTask(null); setShowForm(true); }}
                >
                  + Thêm việc không cố định giờ
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Checklist Mode View ── */
          <div className="timeline-scroll-area">
            <div className="checklist-container">
              {tasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">Chưa có task nào cho ngày {fullDate}</div>
                  <button className="btn btn-primary" onClick={() => { setEditTask(null); setShowForm(true); }}>
                    + Thêm task đầu tiên
                  </button>
                </div>
              ) : (
                categories.map(cat => {
                  const catTasks = tasks.filter(t => t.category_id === cat.id);
                  if (catTasks.length === 0) return null;
                  return (
                    <div key={cat.id} className="checklist-group">
                      <div className="checklist-group-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: cat.color }}>
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>({catTasks.filter(t => t.is_completed).length}/{catTasks.length})</span>
                        </div>
                      </div>

                      {catTasks.map(task => {
                        const goal = getGoal(task.goal_id);
                        return (
                          <div
                            key={task.id}
                            className={`checklist-item ${task.is_completed ? 'completed' : ''}`}
                            onClick={() => setFocusTask(task)}
                          >
                            <div
                              className={`checkbox ${task.is_completed ? 'checked' : ''}`}
                              onClick={e => { e.stopPropagation(); handleToggle(task.id); }}
                            />
                            <div className="checklist-item-title">{task.title}</div>

                            {task.start_time && (
                              <span className="badge badge-muted" style={{ fontSize: 11 }}>
                                ⏰ {task.start_time} ({task.duration_minutes || 30}p)
                              </span>
                            )}

                            {goal && (
                              <span className="badge badge-accent" style={{ fontSize: 11 }}>
                                🎯 {goal.title}
                              </span>
                            )}

                            {task.rollover_count > 0 && (
                              <span className="badge badge-warning" style={{ fontSize: 11 }}>
                                ↷×{task.rollover_count}
                              </span>
                            )}

                            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                              <button className="btn-icon btn-sm" onClick={() => { setEditTask(task); setShowForm(true); }}>✏️</button>
                              <button className="btn-icon btn-sm" onClick={() => handleDelete(task.id)}>🗑️</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}

              {/* Tasks without category */}
              {tasks.filter(t => !t.category_id).length > 0 && (
                <div className="checklist-group">
                  <div className="checklist-group-header">
                    <span>📌 Khác / Chưa phân loại</span>
                  </div>
                  {tasks.filter(t => !t.category_id).map(task => (
                    <div
                      key={task.id}
                      className={`checklist-item ${task.is_completed ? 'completed' : ''}`}
                      onClick={() => setFocusTask(task)}
                    >
                      <div
                        className={`checkbox ${task.is_completed ? 'checked' : ''}`}
                        onClick={e => { e.stopPropagation(); handleToggle(task.id); }}
                      />
                      <div className="checklist-item-title">{task.title}</div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn-icon btn-sm" onClick={() => { setEditTask(task); setShowForm(true); }}>✏️</button>
                        <button className="btn-icon btn-sm" onClick={() => handleDelete(task.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                onClick={() => { setEditTask(null); setShowForm(true); }}
              >
                + Thêm task mới
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Focus Mode ── */}
      {focusTask && (
        <FocusMode
          task={focusTask}
          category={getCat(focusTask.category_id)}
          goal={getGoal(focusTask.goal_id)}
          onClose={() => setFocusTask(null)}
          onToggle={handleToggle}
          onEdit={(task) => { setFocusTask(null); setEditTask(task); setShowForm(true); }}
          onDelete={handleDelete}
        />
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <TaskFormModal
          onClose={() => { setShowForm(false); setEditTask(null); }}
          onSave={handleSave}
          date={date}
          categories={categories}
          goals={goals}
          editTask={editTask}
        />
      )}
    </div>
  );
}
