import { supabase, isDemoMode } from './client';
import { format, subDays } from 'date-fns';

// ─── Rich Demo tasks dataset ────────────────────────────────────────────────
const today = format(new Date(), 'yyyy-MM-dd');
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

function generateDemoDataset() {
  const tasks = [
    // Today
    { id: 't-1', title: 'Đọc tài liệu React Hooks & Context API', date: today, start_time: '08:00', duration_minutes: 60, category_id: 'cat-1', goal_id: 'g-week-1', is_completed: true, rollover_count: 0, recurrence: 'none' },
    { id: 't-2', title: 'Viết component DayView & Checklist', date: today, start_time: '09:30', duration_minutes: 90, category_id: 'cat-1', goal_id: 'g-week-1', is_completed: true, rollover_count: 0, recurrence: 'none' },
    { id: 't-3', title: 'Chạy bộ 5km vòng công viên', date: today, start_time: '06:30', duration_minutes: 45, category_id: 'cat-2', goal_id: 'g-week-2', is_completed: true, rollover_count: 0, recurrence: 'daily' },
    { id: 't-4', title: 'Họp Sprint Review & Kế hoạch tuần', date: today, start_time: '14:00', duration_minutes: 60, category_id: 'cat-3', goal_id: 'g-month-1', is_completed: true, rollover_count: 0, recurrence: 'weekly' },
    { id: 't-5', title: 'Viết nhật ký & lập mục tiêu ngày mai', date: today, start_time: '21:30', duration_minutes: 30, category_id: 'cat-4', goal_id: null, is_completed: false, rollover_count: 0, recurrence: 'daily' },

    // Yesterday
    { id: 't-6', title: 'Code Supabase Auth & Row Level Security', date: yesterday, start_time: '09:00', duration_minutes: 120, category_id: 'cat-3', goal_id: 'g-month-1', is_completed: true, rollover_count: 0, recurrence: 'none' },
    { id: 't-7', title: 'Tập Gym Cardio & Suối nguồn tươi trẻ', date: yesterday, start_time: '17:00', duration_minutes: 60, category_id: 'cat-2', goal_id: 'g-week-2', is_completed: true, rollover_count: 0, recurrence: 'none' },
    { id: 't-8', title: 'Học 30 từ vựng Tiếng Anh Chuyên ngành', date: yesterday, start_time: '20:00', duration_minutes: 45, category_id: 'cat-1', goal_id: 'g-week-1', is_completed: true, rollover_count: 0, recurrence: 'daily' },
    { id: 't-9', title: 'Review Pull Request & Bug Fixes', date: yesterday, start_time: '15:00', duration_minutes: 90, category_id: 'cat-3', goal_id: 'g-month-1', is_completed: true, rollover_count: 1, recurrence: 'none' },
  ];

  const now = new Date();
  const sampleTitles = [
    { title: 'Nghiên cứu kiến trúc Micro-frontend', cat: 'cat-1', mins: 90, time: '08:30' },
    { title: 'Tập Thể dục & Thiền định 30 phút', cat: 'cat-2', mins: 45, time: '07:00' },
    { title: 'Triển khai Feature Module Dashboard', cat: 'cat-3', mins: 120, time: '10:00' },
    { title: 'Đọc sách Tư duy Đột phá 45p', cat: 'cat-4', mins: 45, time: '21:00' },
    { title: 'Luyện đề Algorithm Leetcode', cat: 'cat-1', mins: 60, time: '14:30' },
    { title: 'Fix bug UI & CSS Responsive', cat: 'cat-3', mins: 90, time: '16:00' },
  ];

  for (let d = 2; d < 30; d++) {
    const dateStr = format(subDays(now, d), 'yyyy-MM-dd');
    const sample = sampleTitles[d % sampleTitles.length];
    tasks.push({
      id: `t-hist-${d}`,
      user_id: 'demo-user-001',
      title: `${sample.title} (${d} ngày trước)`,
      date: dateStr,
      start_time: sample.time,
      duration_minutes: sample.mins,
      category_id: sample.cat,
      goal_id: sample.cat === 'cat-3' ? 'g-month-1' : 'g-week-1',
      is_completed: true,
      rollover_count: d % 7 === 0 ? 1 : 0,
      recurrence: 'none',
      created_at: new Date().toISOString(),
    });
  }

  return tasks;
}

let _demoTasks = generateDemoDataset();

export function getDemoTasks() {
  return _demoTasks;
}

// Helper to sanitize payload for Supabase (handles fallback if recurrence column is not in DB yet)
function sanitizeTaskPayload(payload, userId) {
  const clean = { ...payload };
  delete clean.id;
  delete clean.location;
  if (userId) clean.user_id = userId;
  if (!clean.category_id) clean.category_id = null;
  if (!clean.goal_id) clean.goal_id = null;
  if (!clean.start_time) clean.start_time = null;
  if (!clean.description) clean.description = null;
  if (!clean.original_date) clean.original_date = clean.date;
  if (!clean.recurrence || clean.recurrence === 'none') {
    delete clean.recurrence;
  }
  return clean;
}

// ─── Tasks CRUD ──────────────────────────────────────────────────────────────
export async function getTasksByDate(date) {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  const targetDateObj = new Date(dateStr);

  const isMatchingRecurrence = (t) => {
    if (t.date === dateStr) return true;
    if (!t.recurrence || t.recurrence === 'none') return false;

    const taskDateObj = new Date(t.date);
    if (taskDateObj > targetDateObj) return false;

    if (t.recurrence === 'daily') return true;
    if (t.recurrence === 'weekly') return taskDateObj.getDay() === targetDateObj.getDay();
    if (t.recurrence === 'monthly') return taskDateObj.getDate() === targetDateObj.getDate();
    if (t.recurrence === 'yearly') return taskDateObj.getMonth() === targetDateObj.getMonth() && taskDateObj.getDate() === targetDateObj.getDate();
    return false;
  };

  if (isDemoMode) {
    return { data: _demoTasks.filter(isMatchingRecurrence), error: null };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };

  // Supabase Mode with Column Fallback & user_id filter
  let { data, error } = await supabase
    .from('tasks')
    .select('*, categories(*), goals(title, type)')
    .eq('user_id', user.id)
    .or(`date.eq.${dateStr},recurrence.neq.none`)
    .order('start_time', { ascending: true, nullsFirst: false });

  if (error && (error.message?.includes('recurrence') || error.code === 'PGRST204')) {
    // Fallback if recurrence column is not in Supabase schema yet
    const res = await supabase
      .from('tasks')
      .select('*, categories(*), goals(title, type)')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .order('start_time', { ascending: true, nullsFirst: false });
    data = res.data;
    error = res.error;
  }

  if (error) return { data: null, error };
  const filtered = (data || []).filter(isMatchingRecurrence);
  return { data: filtered, error: null };
}

// Get overdue / pending tasks from PAST DAYS relative to REAL TODAY (Date.now())
export async function getOverdueTasks() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  if (isDemoMode) {
    return { data: _demoTasks.filter(t => t.date < todayStr && !t.is_completed), error: null };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };

  const { data, error } = await supabase
    .from('tasks')
    .select('*, categories(*), goals(title, type)')
    .eq('user_id', user.id)
    .lt('date', todayStr)
    .eq('is_completed', false)
    .order('date', { ascending: false });
  return { data: data || [], error };
}

export async function createTask(taskData) {
  if (isDemoMode) {
    const newTask = {
      id: `t-${Date.now()}`,
      user_id: 'demo-user-001',
      is_completed: false,
      rollover_count: 0,
      recurrence: taskData.recurrence || 'none',
      created_at: new Date().toISOString(),
      original_date: taskData.date,
      ...taskData,
    };
    _demoTasks = [..._demoTasks, newTask];
    return { data: newTask, error: null };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'Chưa đăng nhập' } };

  const payload = sanitizeTaskPayload(taskData, user.id);
  let { data, error } = await supabase.from('tasks').insert(payload).select().single();

  if (error && (error.message?.includes('recurrence') || error.code === 'PGRST204')) {
    // Retry without recurrence column if Supabase table schema hasn't migrated yet
    const fallbackPayload = { ...payload };
    delete fallbackPayload.recurrence;
    const retry = await supabase.from('tasks').insert(fallbackPayload).select().single();
    data = retry.data;
    error = retry.error;
  }

  return { data, error };
}

export async function updateTask(id, updates) {
  if (isDemoMode) {
    _demoTasks = _demoTasks.map(t => t.id === id ? { ...t, ...updates } : t);
    return { data: _demoTasks.find(t => t.id === id), error: null };
  }

  const cleanUpdates = { ...updates };
  if ('category_id' in cleanUpdates && !cleanUpdates.category_id) cleanUpdates.category_id = null;
  if ('goal_id' in cleanUpdates && !cleanUpdates.goal_id) cleanUpdates.goal_id = null;
  if ('start_time' in cleanUpdates && !cleanUpdates.start_time) cleanUpdates.start_time = null;
  if ('recurrence' in cleanUpdates && (!cleanUpdates.recurrence || cleanUpdates.recurrence === 'none')) {
    delete cleanUpdates.recurrence;
  }

  let { data, error } = await supabase.from('tasks').update(cleanUpdates).eq('id', id).select().single();

  if (error && (error.message?.includes('recurrence') || error.code === 'PGRST204')) {
    const fallbackUpdates = { ...cleanUpdates };
    delete fallbackUpdates.recurrence;
    const retry = await supabase.from('tasks').update(fallbackUpdates).eq('id', id).select().single();
    data = retry.data;
    error = retry.error;
  }

  return { data, error };
}

export async function toggleTaskComplete(id) {
  if (isDemoMode) {
    const task = _demoTasks.find(t => t.id === id);
    if (!task) return { error: 'Not found' };
    const updated = { ...task, is_completed: !task.is_completed };
    _demoTasks = _demoTasks.map(t => t.id === id ? updated : t);
    return { data: updated, error: null };
  }

  const { data: task, error: fetchErr } = await supabase.from('tasks').select('is_completed').eq('id', id).single();
  if (fetchErr) return { error: fetchErr };

  const { data, error } = await supabase
    .from('tasks')
    .update({ is_completed: !task.is_completed })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteTask(id) {
  if (isDemoMode) {
    _demoTasks = _demoTasks.filter(t => t.id !== id);
    return { error: null };
  }
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  return { error };
}

export async function rolloverTask(id, newDate) {
  const newDateStr = typeof newDate === 'string' ? newDate : format(newDate, 'yyyy-MM-dd');
  if (isDemoMode) {
    _demoTasks = _demoTasks.map(t =>
      t.id === id ? { ...t, date: newDateStr, rollover_count: (t.rollover_count || 0) + 1 } : t
    );
    return { data: _demoTasks.find(t => t.id === id), error: null };
  }

  const { data: task, error: fetchErr } = await supabase.from('tasks').select('rollover_count').eq('id', id).single();
  if (fetchErr) return { error: fetchErr };

  const { data, error } = await supabase
    .from('tasks')
    .update({
      date: newDateStr,
      rollover_count: (task.rollover_count || 0) + 1,
    })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function importTasksBatch(tasksList) {
  if (isDemoMode) {
    const created = tasksList.map((t, idx) => ({
      id: `t-imp-${Date.now()}-${idx}`,
      user_id: 'demo-user-001',
      is_completed: false,
      rollover_count: 0,
      recurrence: t.recurrence || 'none',
      created_at: new Date().toISOString(),
      original_date: t.date,
      ...t,
    }));
    _demoTasks = [..._demoTasks, ...created];
    return { data: created, error: null };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'Chưa đăng nhập' } };

  const payloads = tasksList.map(t => sanitizeTaskPayload(t, user.id));

  // Chunk batch insert in groups of 50
  const BATCH_SIZE = 50;
  let allData = [];

  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const chunk = payloads.slice(i, i + BATCH_SIZE);
    let { data, error } = await supabase.from('tasks').insert(chunk).select();

    if (error && (error.message?.includes('recurrence') || error.code === 'PGRST204')) {
      const fallbackChunk = chunk.map(p => {
        const copy = { ...p };
        delete copy.recurrence;
        return copy;
      });
      const retry = await supabase.from('tasks').insert(fallbackChunk).select();
      if (retry.error) {
        console.error('Batch import retry error:', retry.error);
        return { data: null, error: retry.error };
      }
      if (retry.data) allData = [...allData, ...retry.data];
    } else if (error) {
      console.error('Batch import error:', error);
      return { data: null, error };
    } else if (data) {
      allData = [...allData, ...data];
    }
  }

  return { data: allData, error: null };
}
