import React, { useState, useEffect } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getGoals, createGoal, updateGoal, deleteGoal, getCategories, DEMO_CATEGORIES } from '../../api/goals';
import '../../styles/visualization.css';

const TYPE_LABELS = { year: 'Năm', month: 'Tháng', week: 'Tuần' };
const TYPE_ICONS = { year: '🏆', month: '🗓️', week: '📆' };

function GoalModal({ onClose, onSave, type, parentGoals, categories, editGoal }) {
  const [form, setForm] = useState({
    title: editGoal?.title || '',
    category_id: editGoal?.category_id || (categories[0]?.id || ''),
    parent_id: editGoal?.parent_id || '',
    deadline: editGoal?.deadline ? format(parseISO(editGoal.deadline), 'yyyy-MM-dd') : '',
    status: editGoal?.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Vui lòng nhập tiêu đề mục tiêu.'); return; }
    setLoading(true);
    setError('');
    const res = await onSave({ ...form, type });
    setLoading(false);
    if (res?.error) {
      const msg = typeof res.error === 'string' ? res.error : res.error?.message || 'Không thể lưu mục tiêu.';
      setError(msg);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">
            {editGoal ? '✏️ Sửa mục tiêu' : `➕ Tạo mục tiêu ${TYPE_LABELS[type]}`}
          </h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div className="auth-alert error" style={{ marginBottom: '16px' }}>{String(error)}</div>}

        <div className="form-group">
          <label className="form-label">Tiêu đề mục tiêu *</label>
          <input
            id="goal-form-title"
            className="input"
            placeholder={type === 'year' ? 'VD: Xây nền tảng sự nghiệp...' : type === 'month' ? 'VD: Hoàn thành khóa học React...' : 'VD: Học xong phần Hooks...'}
            value={form.title}
            onChange={e => set('title', e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Danh mục</label>
          <select id="goal-form-category" className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">— Chọn danh mục —</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        {type !== 'year' && parentGoals.length > 0 && (
          <div className="form-group">
            <label className="form-label">Mục tiêu cha ({type === 'month' ? 'Năm' : 'Tháng'})</label>
            <select id="goal-form-parent" className="input" value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
              <option value="">— Không có cha —</option>
              {parentGoals.map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Deadline (tuỳ chọn)</label>
          <input id="goal-form-deadline" type="date" className="input" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Huỷ</button>
          <button id="goal-form-save" className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? '⏳ Đang lưu...' : editGoal ? '💾 Lưu' : '➕ Tạo mục tiêu'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal, allGoals, categories, type, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const cat = categories.find(c => c.id === goal.category_id);
  const children = allGoals.filter(g => g.parent_id === goal.id);

  const daysLeft = goal.deadline
    ? differenceInDays(parseISO(goal.deadline), new Date())
    : null;

  const pct = goal.progress || 0;
  const progressColor = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--accent-primary)';

  return (
    <div className="goal-card" style={{ background: '#fff', border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '16px', marginBottom: '12px', boxShadow: 'var(--shadow-sm)' }}>
      <div className="goal-card-main" onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="goal-card-left" style={{ flex: 1 }}>
          <div className="goal-card-title" style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {goal.title}
            {cat && (
              <span className="badge" style={{ background: `${cat.color}15`, color: cat.color, fontSize: '11px' }}>
                <span className="color-dot" style={{ background: cat.color, width: 7, height: 7 }} />
                {cat.name}
              </span>
            )}
            {goal.status === 'completed' && <span className="badge badge-success">✓ Hoàn thành</span>}
          </div>
          <div className="goal-card-progress" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <div className="progress-bar" style={{ flex: 1, maxWidth: 300 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: progressColor }} />
            </div>
            <span className="goal-progress-pct" style={{ color: progressColor, fontWeight: 700, fontSize: 13 }}>{pct}%</span>
          </div>
        </div>

        <div className="goal-card-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {daysLeft !== null && (
            <span className={`badge ${daysLeft <= 3 ? 'badge-danger' : daysLeft <= 14 ? 'badge-warning' : 'badge-muted'}`}>
              {daysLeft <= 0 ? '⚠️ Hết hạn' : `📅 ${daysLeft} ngày`}
            </span>
          )}
          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
            <button className="btn-icon" style={{ fontSize: 14 }} onClick={() => onEdit(goal)}>✏️</button>
            <button className="btn-icon" style={{ fontSize: 14 }} onClick={() => onDelete(goal.id)}>🗑️</button>
          </div>
          <span style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>
            ▾
          </span>
        </div>
      </div>

      {expanded && (
        <div className="goal-children" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          {children.length === 0 ? (
            <div style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
              Chưa có mục tiêu con.
            </div>
          ) : (
            children.map(child => (
              <div key={child.id} className="goal-child" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>
                  {TYPE_ICONS[child.type] || '•'}
                </span>
                <span className="goal-child-title" style={{ flex: 1, fontSize: 13 }}>{child.title}</span>
                <div style={{ width: 80 }}>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${child.progress || 0}%` }} />
                  </div>
                </div>
                <span className="goal-child-pct" style={{ fontSize: 12, fontWeight: 600 }}>{child.progress || 0}%</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function GoalView({ type }) {
  const [goals, setGoals] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [categories, setCategories] = useState(DEMO_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: typed }, { data: all }, { data: cats }] = await Promise.all([
      getGoals(type),
      getGoals(),
      getCategories(),
    ]);
    setGoals(typed || []);
    setAllGoals(all || []);
    if (cats && cats.length > 0) setCategories(cats);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [type]);

  const parentType = type === 'month' ? 'year' : type === 'week' ? 'month' : null;
  const parentGoals = allGoals.filter(g => g.type === parentType);

  const handleSave = async (formData) => {
    let res;
    if (editGoal) {
      res = await updateGoal(editGoal.id, formData);
    } else {
      res = await createGoal(formData);
    }
    if (!res?.error) {
      await fetchAll();
    }
    return res;
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá mục tiêu này?')) return;
    await deleteGoal(id);
    await fetchAll();
  };

  const sortedGoals = [...goals].sort((a, b) => {
    if (!a.deadline && !b.deadline) return (a.progress || 0) - (b.progress || 0);
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    const dA = differenceInDays(parseISO(a.deadline), new Date());
    const dB = differenceInDays(parseISO(b.deadline), new Date());
    if (dA !== dB) return dA - dB;
    return (a.progress || 0) - (b.progress || 0);
  });

  return (
    <div className="goals-page page-container">
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">{TYPE_ICONS[type]} Mục tiêu {TYPE_LABELS[type]}</h1>
          <p className="page-subtitle">
            {type === 'year' && 'Objective lớn, định hướng cả năm'}
            {type === 'month' && 'Key Results trung hạn, cụ thể hoá từng tháng'}
            {type === 'week' && 'Hành động cụ thể, đo lường được trong tuần này'}
          </p>
        </div>
        <button
          id={`create-goal-${type}`}
          className="btn btn-primary"
          onClick={() => { setEditGoal(null); setShowModal(true); }}
        >
          + Tạo mục tiêu {TYPE_LABELS[type]}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" />
        </div>
      ) : sortedGoals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{TYPE_ICONS[type]}</div>
          <div className="empty-state-title">Chưa có mục tiêu {TYPE_LABELS[type]} nào</div>
          <div className="empty-state-desc">
            Bắt đầu bằng cách tạo mục tiêu {TYPE_LABELS[type]} đầu tiên của bạn.
          </div>
          <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setShowModal(true)}>
            + Tạo ngay
          </button>
        </div>
      ) : (
        sortedGoals.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            allGoals={allGoals}
            categories={categories}
            type={type}
            onEdit={(g) => { setEditGoal(g); setShowModal(true); }}
            onDelete={handleDelete}
          />
        ))
      )}

      {showModal && (
        <GoalModal
          onClose={() => { setShowModal(false); setEditGoal(null); }}
          onSave={handleSave}
          type={type}
          parentGoals={parentGoals}
          categories={categories}
          editGoal={editGoal}
        />
      )}
    </div>
  );
}
