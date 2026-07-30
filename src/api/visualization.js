import { supabase, isDemoMode } from './client';
import { format, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getDemoTasks } from './tasks';
import { getCategories, DEMO_CATEGORIES } from './goals';

// ─── Real Heatmap Calculation from Tasks ─────────────────────────────────────
function calculateHeatmapFromTasks(tasks, days = 90) {
  const result = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(t => t.date === dateStr);
    const completed = dayTasks.filter(t => t.is_completed).length;
    const total = dayTasks.length;
    const completion_pct = total > 0 ? completed / total : 0;
    result.push({ date: dateStr, completion_pct, completed, total });
  }
  return result;
}

// ─── Real Time-of-Day Calculation from Tasks ─────────────────────────────────
function calculateTimeOfDayFromTasks(tasks) {
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, task_count: 0 }));
  const completedTasks = tasks.filter(t => t.is_completed);

  completedTasks.forEach(t => {
    if (t.start_time) {
      const h = parseInt(t.start_time.split(':')[0], 10);
      if (!isNaN(h) && h >= 0 && h < 24) {
        hours[h].task_count += 1;
      }
    }
  });

  return hours;
}

// ─── Compute streak from tasks ────────────────────────────────────────────────
function computeStreakFromTasks(tasks) {
  const today = new Date();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < 365; i++) {
    const d = format(subDays(today, i), 'yyyy-MM-dd');
    const dayCompleted = tasks.filter(t => t.date === d && t.is_completed);
    if (dayCompleted.length > 0) {
      if (i === 0 || currentStreak > 0) currentStreak++;
      tempStreak++;
    } else {
      if (i === 0) currentStreak = 0;
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  return { current_streak: currentStreak, longest_streak: longestStreak };
}

// Helper to fetch user tasks filtered by authenticated user_id
async function fetchUserTasks() {
  if (isDemoMode) return getDemoTasks();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id);
  return data || [];
}

// ─── Calculate Goal Time Stats from Tasks ────────────────────────────────────
export async function getGoalTimeStats() {
  let tasks = [];
  if (isDemoMode) {
    tasks = getDemoTasks();
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: {}, error: null };
    const { data } = await supabase
      .from('tasks')
      .select('goal_id, duration_minutes, is_completed')
      .eq('user_id', user.id)
      .not('goal_id', 'is', null);
    tasks = data || [];
  }

  const goalMap = {};
  tasks.forEach(t => {
    if (t.goal_id) {
      if (!goalMap[t.goal_id]) {
        goalMap[t.goal_id] = { totalMinutes: 0, completedTasks: 0, totalTasks: 0 };
      }
      goalMap[t.goal_id].totalTasks += 1;
      const dur = t.duration_minutes || 30;
      if (t.is_completed) {
        goalMap[t.goal_id].completedTasks += 1;
        goalMap[t.goal_id].totalMinutes += dur;
      }
    }
  });

  return { data: goalMap, error: null };
}

// ─── Get Time Allocation Bar Data by Timeframe & Category ────────────────────
export async function getTimeRangeBarData(timeframe = '1m', categoryId = 'all') {
  const tasks = await fetchUserTasks();

  let filtered = tasks.filter(t => t.is_completed);
  if (categoryId && categoryId !== 'all') {
    filtered = filtered.filter(t => t.category_id === categoryId);
  }

  const today = new Date();
  const result = [];

  if (timeframe === '1w') {
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const label = format(d, 'EE dd/MM', { locale: vi });
      const dayTasks = filtered.filter(t => t.date === dateStr);
      const mins = dayTasks.reduce((acc, t) => acc + (t.duration_minutes || 45), 0);
      result.push({ label, hours: Number((mins / 60).toFixed(1)), minutes: mins });
    }
  } else if (timeframe === '1m') {
    for (let i = 5; i >= 0; i--) {
      const startD = subDays(today, (i + 1) * 5);
      const endD = subDays(today, i * 5);
      const startStr = format(startD, 'yyyy-MM-dd');
      const endStr = format(endD, 'yyyy-MM-dd');
      const label = `${format(startD, 'dd/MM')}-${format(endD, 'dd/MM')}`;
      const periodTasks = filtered.filter(t => t.date >= startStr && t.date <= endStr);
      const mins = periodTasks.reduce((acc, t) => acc + (t.duration_minutes || 45), 0);
      result.push({ label, hours: Number((mins / 60).toFixed(1)), minutes: mins });
    }
  } else if (timeframe === '6m') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = `Thg ${d.getMonth() + 1}`;
      const monthPrefix = format(d, 'yyyy-MM');
      const monthTasks = filtered.filter(t => t.date && t.date.startsWith(monthPrefix));
      const mins = monthTasks.reduce((acc, t) => acc + (t.duration_minutes || 45), 0);
      const hours = Number((mins / 60).toFixed(1));
      result.push({ label, hours, minutes: mins });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = `T${d.getMonth() + 1}`;
      const monthPrefix = format(d, 'yyyy-MM');
      const monthTasks = filtered.filter(t => t.date && t.date.startsWith(monthPrefix));
      const mins = monthTasks.reduce((acc, t) => acc + (t.duration_minutes || 45), 0);
      const hours = Number((mins / 60).toFixed(1));
      result.push({ label, hours, minutes: mins });
    }
  }

  return { data: result, error: null };
}

// ─── Minimal Ultra-Clean Radar Data (Relative Time Correlation per Category) ───
export async function getRadarData(days = 30) {
  let tasks = [];
  let categories = [];

  if (isDemoMode) {
    tasks = getDemoTasks();
    const { data: catRes } = await getCategories();
    categories = catRes && catRes.length > 0 ? catRes : DEMO_CATEGORIES;
  } else {
    const { data: catRes } = await getCategories();
    tasks = await fetchUserTasks();
    categories = catRes && catRes.length > 0 ? catRes : DEMO_CATEGORIES;
  }

  const completed = tasks.filter(t => t.is_completed);
  const activeDays = Math.max(1, new Set(completed.map(t => t.date)).size);

  const rawData = categories.map(cat => {
    const catTasks = completed.filter(t => t.category_id === cat.id);
    const mins = catTasks.reduce((acc, t) => acc + (t.duration_minutes || 45), 0);
    const hrs = Number((mins / 60).toFixed(1));
    return { cat, hrs, mins };
  });

  const totalHoursAll = rawData.reduce((acc, d) => acc + d.hrs, 0);
  const maxHrs = Math.max(...rawData.map(d => d.hrs)) || 0;

  const data = rawData.map(({ cat, hrs }) => {
    const percent = totalHoursAll > 0 ? Math.round((hrs / totalHoursAll) * 100) : 0;
    const relativeValue = maxHrs > 0 ? Math.max(15, Math.round((hrs / maxHrs) * 100)) : 0;
    const avgMins = Math.round((hrs * 60) / activeDays);

    return {
      category: `${cat.icon || '📌'} ${cat.name}`,
      category_id: cat.id,
      value: relativeValue,
      totalHours: hrs,
      percent: percent,
      avgMins: avgMins,
      color: cat.color || '#5b6ec7',
    };
  });

  return { data, error: null };
}

// ─── Public API ──────────────────────────────────────────────────────────────
export async function getStreakData() {
  const tasks = await fetchUserTasks();
  return { data: computeStreakFromTasks(tasks), error: null };
}

export async function getHeatmapData(days = 90) {
  const tasks = await fetchUserTasks();
  return { data: calculateHeatmapFromTasks(tasks, days), error: null };
}

export async function getTimeOfDayData() {
  const tasks = await fetchUserTasks();
  return { data: calculateTimeOfDayFromTasks(tasks), error: null };
}

export async function getStackedBarData(weeks = 8) {
  const weeksData = [];
  const tasks = await fetchUserTasks();

  for (let w = weeks - 1; w >= 0; w--) {
    const weekLabel = `T${weeks - w}`;
    weeksData.push({
      week: weekLabel,
      'Học tập': tasks.filter(t => t.category_id === 'cat-1' && t.is_completed).length,
      'Sức khỏe': tasks.filter(t => t.category_id === 'cat-2' && t.is_completed).length,
      'Công việc': tasks.filter(t => t.category_id === 'cat-3' && t.is_completed).length,
      'Cá nhân': tasks.filter(t => t.category_id === 'cat-4' && t.is_completed).length,
    });
  }
  return { data: weeksData, error: null };
}

export async function getHabitStrength() {
  const tasks = await fetchUserTasks();

  if (tasks.length === 0) {
    return {
      data: { score: 0, consistencyRate: 0, rolloverRate: 0 },
      error: null,
    };
  }

  const completed = tasks.filter(t => t.is_completed).length;
  const total = tasks.length || 1;
  const consistencyRate = completed / total;
  const rolloverCount = tasks.reduce((acc, t) => acc + (t.rollover_count || 0), 0);
  const rolloverRate = rolloverCount > 0 ? Math.min(1, rolloverCount / total) : 0;
  const score = Math.min(100, Math.max(10, Math.round(consistencyRate * 100 - rolloverRate * 30)));

  return {
    data: { score, consistencyRate, rolloverRate },
    error: null,
  };
}

export async function getSummaryStats() {
  const tasks = await fetchUserTasks();

  const streak = computeStreakFromTasks(tasks);
  const completed = tasks.filter(t => t.is_completed).length;
  const total = tasks.length || 1;
  const weeklyCompletion = total > 0 ? Math.round((completed / total) * 100) : 0;
  const rolloverCount = tasks.reduce((acc, t) => acc + (t.rollover_count || 0), 0);
  const delayScore = total > 0 ? Number((rolloverCount / total).toFixed(1)) : 0;

  return {
    data: {
      streak,
      weeklyCompletion,
      delayScore,
    },
    error: null,
  };
}
