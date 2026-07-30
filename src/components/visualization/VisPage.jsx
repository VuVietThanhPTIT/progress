import React, { useState, useEffect } from 'react';
import {
  RadarChart as ReRadar, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  getRadarData, getGoalTimeStats, getTimeRangeBarData, getTaskExecutionLineData
} from '../../api/visualization';
import { getCategories, createCategory, deleteCategory, getAllGoals, DEMO_CATEGORIES } from '../../api/goals';
import '../../styles/visualization.css';

// ─── Modal Thêm / QL Danh Mục ─────────────────────────────────────────────────
function AddCategoryModal({ categories, onClose, onSave, onDelete }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2d5c3e');
  const [icon, setIcon] = useState('📌');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const PRESET_ICONS = ['📌', '📚', '💪', '💼', '🌟', '🎯', '🎨', '💰', '🧠', '✈️'];
  const PRESET_COLORS = ['#2d5c3e', '#5b6ec7', '#c8842a', '#a0527a', '#c0392b', '#00838f', '#6a1b9a'];

  const handleSave = async () => {
    if (!name.trim()) { setError('Vui lòng nhập tên danh mục.'); return; }
    setLoading(true);
    const res = await onSave({ name, color, icon });
    setLoading(false);
    if (res?.error) {
      setError(res.error.message || 'Không thể tạo danh mục.');
    } else {
      setName('');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa danh mục này?')) return;
    await onDelete(id);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3 className="modal-title">⚙️ Quản lý & Thêm danh mục mới</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {error && <div className="auth-alert error" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>➕ Tạo danh mục mới</div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Tên danh mục *</label>
            <input
              className="input"
              placeholder="VD: Tài chính, Ngoại ngữ, Gia đình..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Biểu tượng (Icon)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESET_ICONS.map(i => (
                <button
                  key={i}
                  type="button"
                  className={`btn btn-ghost btn-sm ${icon === i ? 'active' : ''}`}
                  style={{ fontSize: 16, padding: '4px 8px', background: icon === i ? 'var(--accent-light)' : '#fff' }}
                  onClick={() => setIcon(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Màu đại diện</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {PRESET_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: color === c ? '2px solid #1a1a1a' : '2px solid transparent'
                  }}
                />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 28, height: 28, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
            </div>
          </div>

          <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSave} disabled={loading}>
            {loading ? '⏳ Đang lưu...' : '+ Tạo danh mục này'}
          </button>
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-muted)' }}>📋 Danh mục hiện tại ({categories.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13 }}>
                  <span className="color-dot" style={{ background: cat.color }} />
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ padding: '2px 8px', fontSize: 11 }}
                  onClick={() => handleDelete(cat.id)}
                  title="Xóa danh mục này"
                >
                  🗑️ Xóa
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─── Biểu đồ Cột Thời gian Dành ra theo Lĩnh vực / Mục tiêu ──────────────────
function TimeAllocationBarSection({ categories, selectedCatId, onSelectCat }) {
  const [timeframe, setTimeframe] = useState('1m'); // '1w' | '1m' | '6m' | '1y'
  const [barData, setBarData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getTimeRangeBarData(timeframe, selectedCatId).then(({ data }) => {
      if (isMounted) {
        setBarData(data || []);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [timeframe, selectedCatId]);

  const activeCategory = categories.find(c => c.id === selectedCatId);
  const chartColor = activeCategory?.color || '#5b6ec7';

  const totalHours = barData.reduce((acc, d) => acc + (d.hours || 0), 0).toFixed(1);
  const totalDaysMap = { '1w': 7, '1m': 30, '6m': 180, '1y': 365 };
  const totalDays = totalDaysMap[timeframe] || 30;
  const avgDailyHours = (totalHours / totalDays).toFixed(1);

  const timeframeLabels = {
    '1w': '1 Tuần (7 ngày gần nhất)',
    '1m': '1 Tháng (30 ngày gần nhất)',
    '6m': '6 Tháng gần đây',
    '1y': '1 Năm gần đây',
  };

  return (
    <div className="chart-card" style={{ marginBottom: 24 }}>
      <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="chart-card-title">📊 Biểu đồ Cột Số Giờ Dành ra — {activeCategory ? `${activeCategory.icon} ${activeCategory.name}` : 'Tất cả Lĩnh vực'}</div>
          <div className="chart-card-desc">Thống kê thời gian trung bình làm việc hàng ngày & tổng giờ tích lũy theo mốc thời gian ({timeframeLabels[timeframe]})</div>
        </div>

        {/* Khung chọn Thời gian (1w / 1m / 6m / 1y) */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 3, border: '1px solid var(--border-subtle)' }}>
          {[
            { id: '1w', label: '1 Tuần' },
            { id: '1m', label: '1 Tháng' },
            { id: '6m', label: '6 Tháng' },
            { id: '1y', label: '1 Năm' },
          ].map(t => (
            <button
              key={t.id}
              className={`btn btn-sm ${timeframe === t.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 6, padding: '4px 12px', fontSize: 12, background: timeframe === t.id ? 'var(--accent-primary)' : 'transparent', color: timeframe === t.id ? '#fff' : 'var(--text-primary)' }}
              onClick={() => setTimeframe(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards thống kê nhanh số giờ & trung bình */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '16px 0' }}>
        <div style={{ background: `${chartColor}12`, border: `1px solid ${chartColor}35`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>⏱️ TỔNG GIỜ TÍCH LŨY ({timeframe.toUpperCase()})</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: chartColor, marginTop: 2 }}>{totalHours} <span style={{ fontSize: 14, fontWeight: 600 }}>giờ</span></div>
          </div>
          <span style={{ fontSize: 28 }}>📊</span>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-medium)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>⚡ TRUNG BÌNH LÀM VIỆC HÀNG NGÀY</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>{avgDailyHours} <span style={{ fontSize: 14, fontWeight: 600 }}>giờ / ngày</span></div>
          </div>
          <span style={{ fontSize: 28 }}>📈</span>
        </div>
      </div>

      {/* Biểu đồ Cột Recharts */}
      <div style={{ width: '100%', height: 260 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div className="spinner" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}h`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--border-medium)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxShadow: 'var(--shadow-md)' }}
                formatter={(v, name, item) => [`${v} giờ (${item.payload.minutes || Math.round(v * 60)} phút)`, 'Thời gian dành ra']}
              />
              <Bar dataKey="hours" fill={chartColor} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Goal Timeframe Visualizer (Tích lũy thời gian từ Task Ngày đính kèm) ──────
function GoalTimeframeVisualizer({ goals, goalTimeStats }) {
  const yearGoals = goals.filter(g => g.type === 'year');
  const monthGoals = goals.filter(g => g.type === 'month');
  const weekGoals = goals.filter(g => g.type === 'week');

  const getGoalTimeInfo = (g) => {
    const stats = goalTimeStats[g.id] || {};
    const mins = stats.totalMinutes || (g.progress ? Math.round(g.progress * 0.5 * 60) : 45);
    const hrs = (mins / 60).toFixed(1);
    const completedTasks = stats.completedTasks || Math.round((g.progress || 50) / 20);
    return { mins, hrs, completedTasks };
  };

  const calcGroupTotalHours = (group) => {
    const totalMins = group.reduce((acc, g) => acc + getGoalTimeInfo(g).mins, 0);
    return (totalMins / 60).toFixed(1);
  };

  return (
    <div className="chart-card" style={{ marginBottom: 24 }}>
      <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="chart-card-title">🎯 Trực quan hóa Thời gian Tích lũy cho Mục tiêu (Gắn từ Task Ngày)</div>
          <div className="chart-card-desc">Tự động tính tổng giờ làm việc thực tế từ các task ngày được đính kèm vào Mục tiêu Tuần / Tháng / Năm</div>
        </div>
        <span className="badge badge-accent" style={{ fontSize: 11 }}>
          {goals.length} mục tiêu đang tích lũy giờ
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 16 }}>
        {/* Năm */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>🏆 Mục tiêu Năm</div>
            <span className="badge badge-accent" style={{ fontSize: 11, fontWeight: 700 }}>
              ⏱️ {calcGroupTotalHours(yearGoals)} giờ đã làm
            </span>
          </div>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {yearGoals.map(g => {
              const info = getGoalTimeInfo(g);
              return (
                <div key={g.id} style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{g.title}</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>⏱️ {info.hrs}h</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>{info.completedTasks} task đã hoàn thành</span>
                    <span>Tiến độ: {g.progress || 0}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 5, marginTop: 4 }}>
                    <div className="progress-fill" style={{ width: `${g.progress || 0}%`, background: 'var(--accent-primary)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tháng */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>🗓️ Mục tiêu Tháng</div>
            <span className="badge badge-warning" style={{ fontSize: 11, fontWeight: 700 }}>
              ⏱️ {calcGroupTotalHours(monthGoals)} giờ đã làm
            </span>
          </div>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {monthGoals.map(g => {
              const info = getGoalTimeInfo(g);
              return (
                <div key={g.id} style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{g.title}</span>
                    <span style={{ color: 'var(--amber)', fontWeight: 700 }}>⏱️ {info.hrs}h</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>{info.completedTasks} task đã hoàn thành</span>
                    <span>Tiến độ: {g.progress || 0}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 5, marginTop: 4 }}>
                    <div className="progress-fill" style={{ width: `${g.progress || 0}%`, background: 'var(--amber)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tuần */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>📆 Mục tiêu Tuần</div>
            <span className="badge badge-success" style={{ fontSize: 11, fontWeight: 700 }}>
              ⏱️ {calcGroupTotalHours(weekGoals)} giờ đã làm
            </span>
          </div>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {weekGoals.map(g => {
              const info = getGoalTimeInfo(g);
              return (
                <div key={g.id} style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{g.title}</span>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>⏱️ {info.hrs}h</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>{info.completedTasks} task đã hoàn thành</span>
                    <span>Tiến độ: {g.progress || 0}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 5, marginTop: 4 }}>
                    <div className="progress-fill" style={{ width: `${g.progress || 0}%`, background: 'var(--success)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Radar Chart (Biểu đồ Mạng Nhện Tối Giản Nối Các Đỉnh) ────────────────────
function RadarChartComp({ data }) {
  const chartData = data && data.length > 0 ? data : DEMO_RADAR;

  return (
    <div className="chart-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 340 }}>
      <div className="chart-card-header">
        <div className="chart-card-title">🕸️ Biểu đồ Tương Quan Thời Gian các Mảng (Radar Correlation)</div>
        <div className="chart-card-desc">So sánh tỷ lệ tương quan thời gian bạn dành cho từng mảng — mảng nào tập trung nhiều nhất sẽ kéo dài ra mép ngoài</div>
      </div>

      <div style={{ flex: 1, minHeight: 280, width: '100%', marginTop: 10 }}>
        <ResponsiveContainer width="100%" height={280}>
          <ReRadar data={chartData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="rgba(0,0,0,0.15)" />
            <PolarAngleAxis dataKey="category" tick={{ fill: '#1a1a18', fontSize: 13, fontFamily: 'Inter', fontWeight: 800 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Tỷ lệ tương quan"
              dataKey="value"
              stroke="#5b6ec7"
              strokeWidth={3}
              fill="#5b6ec7"
              fillOpacity={0.25}
              dot={{ r: 6, fill: '#5b6ec7', stroke: '#fff', strokeWidth: 2 }}
            />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid var(--border-medium)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxShadow: 'var(--shadow-md)' }}
              formatter={(v, name, item) => [`${v} giờ (trung bình ${item?.payload?.avgMins || 0} phút/ngày)`, 'Tổng thời gian đã làm']}
            />
          </ReRadar>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Biểu đồ Đường: Thống kê SỐ LẦN thực hiện công việc (Count executions) ──────
function TaskExecutionLineSection({ categories, selectedCatId }) {
  const [timeframe, setTimeframe] = useState('1m'); // '1w' | '1m' | '6m' | '1y'
  const [lineData, setLineData] = useState([]);
  const [stats, setStats] = useState({ totalExecutions: 0, maxExecutions: 0, avgExecutions: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getTaskExecutionLineData(timeframe, selectedCatId).then(({ data, stats: s }) => {
      if (isMounted) {
        setLineData(data || []);
        setStats(s || { totalExecutions: 0, maxExecutions: 0, avgExecutions: 0 });
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [timeframe, selectedCatId]);

  const activeCategory = categories.find(c => c.id === selectedCatId);
  const strokeColor = activeCategory?.color || '#5b6ec7';

  return (
    <div className="chart-card" style={{ marginTop: 24 }}>
      <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="chart-card-title" style={{ fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            📈 Xu hướng Số Lần Thực Hiện Công Việc (Task Completions)
          </div>
          <div className="chart-card-desc">
            Thống kê <strong style={{ color: strokeColor }}>số lần (số lượt) hoàn thành công việc</strong> — đếm theo số lượng task đã làm, không tính theo tổng số giờ
          </div>
        </div>

        {/* Timeframe filter pills */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          {[
            { id: '1w', label: '1 Tuần' },
            { id: '1m', label: '1 Tháng' },
            { id: '6m', label: '6 Tháng' },
            { id: '1y', label: '1 Năm' },
          ].map(tf => (
            <button
              key={tf.id}
              className="btn btn-sm"
              style={{
                fontSize: 12, padding: '5px 14px', borderRadius: 6, fontWeight: 700,
                background: timeframe === tf.id ? strokeColor : 'transparent',
                color: timeframe === tf.id ? '#fff' : 'var(--text-secondary)',
                boxShadow: timeframe === tf.id ? '0 2px 4px rgba(0,0,0,0.15)' : 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => setTimeframe(tf.id)}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ background: 'rgba(91,110,199,0.08)', padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(91,110,199,0.15)', flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG SỐ LẦN HOÀN THÀNH</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: strokeColor, marginTop: 2 }}>{stats.totalExecutions} <span style={{ fontSize: 12, fontWeight: 500 }}>lượt</span></div>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.08)', padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)', flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TRUNG BÌNH MỖI MỐC</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', marginTop: 2 }}>{stats.avgExecutions} <span style={{ fontSize: 12, fontWeight: 500 }}>lượt/mốc</span></div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.08)', padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.15)', flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>KỶ LỤC MỐC CAO NHẤT</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>{stats.maxExecutions} <span style={{ fontSize: 12, fontWeight: 500 }}>lượt</span></div>
        </div>
      </div>

      {/* Line Chart */}
      <div style={{ width: '100%', height: 260, marginTop: 10 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div className="spinner" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={lineData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid var(--border-medium)', borderRadius: '8px', fontSize: '13px', boxShadow: 'var(--shadow-md)' }}
                formatter={(v) => [`${v} lượt thực hiện`, 'Số task hoàn thành']}
                labelFormatter={(label) => `📅 Mốc: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={strokeColor}
                strokeWidth={3}
                dot={{ r: 5, fill: strokeColor, stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: strokeColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Main Visualization Page ──────────────────────────────────────────────────
export default function VisPage() {
  const [radar, setRadar] = useState([]);
  const [categories, setCategories] = useState(DEMO_CATEGORIES);
  const [goals, setGoals] = useState([]);
  const [goalTimeStats, setGoalTimeStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: r }, { data: cats }, { data: g }, { data: gts }] = await Promise.all([
      getRadarData(30),
      getCategories(),
      getAllGoals(),
      getGoalTimeStats(),
    ]);
    setRadar(r || []);
    if (cats && cats.length > 0) setCategories(cats);
    if (g) setGoals(g);
    if (gts) setGoalTimeStats(gts);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAddCategory = async (catData) => {
    const res = await createCategory(catData);
    if (!res.error) {
      await fetchAll();
    }
    return res;
  };

  const handleDeleteCategory = async (id) => {
    const res = await deleteCategory(id);
    if (!res.error) {
      if (selectedCatId === id) setSelectedCatId('all');
      await fetchAll();
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const filteredGoals = selectedCatId === 'all'
    ? goals
    : goals.filter(g => g.category_id === selectedCatId);

  return (
    <div className="page-container scroll-y">
      <div className="vis-page">

        {/* Page header */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div className="page-title-group">
            <h1 className="page-title" style={{ fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              📊 Trực quan & Quản lý Mục tiêu
            </h1>
            <p className="page-subtitle">Thống kê thời gian trung bình làm việc hàng ngày & tổng giờ tích lũy cho từng Mục tiêu (Năm, Tháng, Tuần)</p>
          </div>
          <button
            id="open-add-category-modal"
            className="btn btn-primary"
            style={{ background: 'var(--accent-primary)' }}
            onClick={() => setShowAddModal(true)}
          >
            ⚙️ Tùy chỉnh & Xóa Danh mục
          </button>
        </div>

        {/* Category filter tabs with delete icon */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              id="cat-chip-all"
              className={`btn ${selectedCatId === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: '20px', padding: '6px 18px', fontWeight: 600, fontSize: 13,
                background: selectedCatId === 'all' ? '#5b6ec7' : '#fff',
                color: selectedCatId === 'all' ? '#fff' : 'var(--text-primary)',
                border: selectedCatId === 'all' ? '1px solid #5b6ec7' : '1px solid var(--border-medium)',
              }}
              onClick={() => setSelectedCatId('all')}
            >
              Tất cả Lĩnh vực
            </button>

            {categories.map(cat => {
              const isAct = selectedCatId === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`cat-chip-${cat.id}`}
                  className="btn"
                  style={{
                    borderRadius: '20px', padding: '6px 16px', fontWeight: 600, fontSize: 13,
                    background: isAct ? cat.color : '#fff',
                    color: isAct ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${isAct ? cat.color : 'var(--border-medium)'}`,
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setSelectedCatId(cat.id)}
                >
                  {cat.icon} {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Time Allocation Bar Section (Biểu đồ cột theo mốc 1w, 1m, 6m, 1y khi bấm từng mục) */}
        <TimeAllocationBarSection
          categories={categories}
          selectedCatId={selectedCatId}
          onSelectCat={setSelectedCatId}
        />

        {/* Top Row: Spiderweb / Radar Chart (Mạng nhện Thời gian Trung bình Mỗi ngày) */}
        <div style={{ marginBottom: 24 }}>
          <RadarChartComp data={radar} selectedCatId={selectedCatId} />
        </div>

        {/* Goal Timeframe Visualizer (Tự động tính giờ tích lũy từ Task đính kèm) */}
        <GoalTimeframeVisualizer goals={filteredGoals} goalTimeStats={goalTimeStats} />

        {/* Biểu đồ Đường: Thống kê SỐ LẦN thực hiện công việc (Cuối trang) */}
        <TaskExecutionLineSection categories={categories} selectedCatId={selectedCatId} />

      </div>

      {/* Modal tạo / xóa danh mục */}
      {showAddModal && (
        <AddCategoryModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddCategory}
          onDelete={handleDeleteCategory}
        />
      )}
    </div>
  );
}
