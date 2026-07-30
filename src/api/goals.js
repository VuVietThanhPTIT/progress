import { supabase, isDemoMode } from './client';

// ─── Demo categories ────────────────────────────────────────────────────────
export const DEMO_CATEGORIES = [
  { id: 'cat-1', name: 'Học tập',   color: '#5b6ec7', icon: '📚' },
  { id: 'cat-2', name: 'Sức khỏe',  color: '#2d7a4f', icon: '💪' },
  { id: 'cat-3', name: 'Công việc', color: '#c8842a', icon: '💼' },
  { id: 'cat-4', name: 'Cá nhân',   color: '#a0527a', icon: '🌟' },
];

let _demoCategories = [...DEMO_CATEGORIES];

let _demoGoals = [
  {
    id: 'g-year-1',
    user_id: 'demo-user-001',
    title: 'Xây dựng nền tảng sự nghiệp & tài chính cá nhân',
    type: 'year',
    parent_id: null,
    category_id: 'cat-3',
    deadline: new Date(new Date().getFullYear(), 11, 31).toISOString(),
    status: 'active',
    progress: 45,
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-month-1',
    user_id: 'demo-user-001',
    title: 'Hoàn thành ứng dụng Focus Ledger fullstack React + Supabase',
    type: 'month',
    parent_id: 'g-year-1',
    category_id: 'cat-3',
    deadline: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
    status: 'active',
    progress: 60,
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-month-2',
    user_id: 'demo-user-001',
    title: 'Duy trì thói quen chạy bộ & ăn uống lành mạnh',
    type: 'month',
    parent_id: 'g-year-1',
    category_id: 'cat-2',
    deadline: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
    status: 'active',
    progress: 75,
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-week-1',
    user_id: 'demo-user-001',
    title: 'Học xong phần Hooks & Context API',
    type: 'week',
    parent_id: 'g-month-1',
    category_id: 'cat-1',
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return d.toISOString(); })(),
    status: 'active',
    progress: 80,
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-week-2',
    user_id: 'demo-user-001',
    title: 'Chạy bộ 3 buổi trong tuần',
    type: 'week',
    parent_id: 'g-month-2',
    category_id: 'cat-2',
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay())); return d.toISOString(); })(),
    status: 'active',
    progress: 33,
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-year-2',
    user_id: 'demo-user-001',
    title: 'Phát triển kỹ năng mềm & mạng lưới nghề nghiệp',
    type: 'year',
    parent_id: null,
    category_id: 'cat-4',
    deadline: new Date(new Date().getFullYear(), 11, 31).toISOString(),
    status: 'active',
    progress: 25,
    created_at: new Date().toISOString(),
  },
];

function sanitizeGoalPayload(payload, userId) {
  const clean = { ...payload };
  if (userId) clean.user_id = userId;
  if (!clean.category_id) clean.category_id = null;
  if (!clean.parent_id) clean.parent_id = null;
  if (!clean.deadline) clean.deadline = null;
  return clean;
}

// ─── Goals CRUD ──────────────────────────────────────────────────────────────
export async function getGoals(type) {
  if (isDemoMode) {
    return { data: _demoGoals.filter(g => !type || g.type === type), error: null };
  }
  let query = supabase.from('goals').select('*, categories(*)');
  if (type) query = query.eq('type', type);
  const { data, error } = await query.order('created_at', { ascending: false });
  return { data, error };
}

export async function getAllGoals() {
  if (isDemoMode) {
    return { data: _demoGoals, error: null };
  }
  const { data, error } = await supabase
    .from('goals')
    .select('*, categories(*)')
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function createGoal(goalData) {
  if (isDemoMode) {
    const newGoal = {
      id: `g-${Date.now()}`,
      user_id: 'demo-user-001',
      progress: 0,
      created_at: new Date().toISOString(),
      ...goalData,
    };
    _demoGoals = [..._demoGoals, newGoal];
    return { data: newGoal, error: null };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'Chưa đăng nhập' } };

  const payload = sanitizeGoalPayload(goalData, user.id);
  const { data, error } = await supabase.from('goals').insert(payload).select().single();
  return { data, error };
}

export async function updateGoal(id, updates) {
  if (isDemoMode) {
    _demoGoals = _demoGoals.map(g => g.id === id ? { ...g, ...updates } : g);
    return { data: _demoGoals.find(g => g.id === id), error: null };
  }

  const clean = { ...updates };
  if ('category_id' in clean && !clean.category_id) clean.category_id = null;
  if ('parent_id' in clean && !clean.parent_id) clean.parent_id = null;
  if ('deadline' in clean && !clean.deadline) clean.deadline = null;

  const { data, error } = await supabase.from('goals').update(clean).eq('id', id).select().single();
  return { data, error };
}

export async function deleteGoal(id) {
  if (isDemoMode) {
    _demoGoals = _demoGoals.filter(g => g.id !== id);
    return { error: null };
  }
  const { error } = await supabase.from('goals').delete().eq('id', id);
  return { error };
}

// ─── Categories ─────────────────────────────────────────────────────────────
export async function getCategories() {
  if (isDemoMode) {
    return { data: _demoCategories, error: null };
  }
  const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
  return { data, error };
}

export async function createCategory(catData) {
  if (isDemoMode) {
    const newCat = {
      id: `cat-${Date.now()}`,
      user_id: 'demo-user-001',
      color: '#2d5c3e',
      icon: '📌',
      ...catData,
    };
    _demoCategories = [..._demoCategories, newCat];
    return { data: newCat, error: null };
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'Chưa đăng nhập' } };

  const payload = { ...catData, user_id: user.id };
  const { data, error } = await supabase.from('categories').insert(payload).select().single();
  return { data, error };
}

export async function deleteCategory(id) {
  if (isDemoMode) {
    _demoCategories = _demoCategories.filter(c => c.id !== id);
    return { error: null };
  }
  const { error } = await supabase.from('categories').delete().eq('id', id);
  return { error };
}
