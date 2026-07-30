-- ============================================================
-- Focus Ledger — Supabase Migration 001: Schema + RLS (Fixed Trigger)
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── Enable UUID extension ─────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Categories ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#2d5c3e',
  icon        TEXT DEFAULT '📌',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Goals ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('year', 'month', 'week')),
  parent_id   UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  deadline    TIMESTAMPTZ,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  progress    NUMERIC(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tasks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  date             DATE NOT NULL,
  start_time       TIME,
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  category_id      UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  goal_id          UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  is_completed     BOOLEAN DEFAULT FALSE,
  rollover_count   INTEGER DEFAULT 0,
  original_date    DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Progress Logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  tasks_completed  INTEGER DEFAULT 0,
  tasks_total      INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON public.tasks(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_goals_user_type ON public.goals(user_id, type);
CREATE INDEX IF NOT EXISTS idx_progress_logs_user_date ON public.progress_logs(user_id, date);

-- ─── Row Level Security ─────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can CRUD own categories') THEN
    CREATE POLICY "Users can CRUD own categories" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can CRUD own goals') THEN
    CREATE POLICY "Users can CRUD own goals" ON public.goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can CRUD own tasks') THEN
    CREATE POLICY "Users can CRUD own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can CRUD own progress_logs') THEN
    CREATE POLICY "Users can CRUD own progress_logs" ON public.progress_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ─── Seed default categories for new users (Fixed Schema Path) ─────────────
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, color, icon) VALUES
    (NEW.id, 'Học tập', '#5b6ec7', '📚'),
    (NEW.id, 'Sức khỏe', '#2d7a4f', '💪'),
    (NEW.id, 'Công việc', '#c8842a', '💼'),
    (NEW.id, 'Cá nhân', '#a0527a', '🌟');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_categories();

-- ─── Update goal progress when task is toggled ──────────────
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_id UUID;
  v_total INTEGER;
  v_completed INTEGER;
  v_pct NUMERIC;
BEGIN
  v_goal_id := COALESCE(NEW.goal_id, OLD.goal_id);
  IF v_goal_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed = TRUE)
  INTO v_total, v_completed
  FROM public.tasks WHERE goal_id = v_goal_id AND user_id = NEW.user_id;

  IF v_total > 0 THEN
    v_pct := (v_completed::NUMERIC / v_total) * 100;
    UPDATE public.goals SET progress = ROUND(v_pct, 1) WHERE id = v_goal_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_change ON public.tasks;
CREATE TRIGGER on_task_change
  AFTER INSERT OR UPDATE OF is_completed, goal_id OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_goal_progress();
