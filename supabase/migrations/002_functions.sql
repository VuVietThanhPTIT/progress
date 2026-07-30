-- ============================================================
-- Focus Ledger — Supabase Migration 002: Postgres Functions
-- Run this AFTER 001_schema.sql
-- These functions are called via supabase.rpc() from the frontend
-- ============================================================

-- ─── 1. get_streak: Current + Longest streak ───────────────
CREATE OR REPLACE FUNCTION get_streak()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current INTEGER := 0;
  v_longest INTEGER := 0;
  v_temp INTEGER := 0;
  v_date DATE := CURRENT_DATE;
  v_has_task BOOLEAN;
BEGIN
  -- Walk backwards from today
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM tasks
      WHERE user_id = v_user_id
        AND date = v_date
        AND is_completed = TRUE
    ) INTO v_has_task;

    IF v_has_task THEN
      v_temp := v_temp + 1;
      IF v_date = CURRENT_DATE OR v_current > 0 THEN
        v_current := v_current + 1;
      END IF;
    ELSE
      -- Gap found
      IF v_date < CURRENT_DATE THEN
        v_current := 0;
      END IF;
      IF v_temp > v_longest THEN v_longest := v_temp; END IF;
      v_temp := 0;
    END IF;

    v_date := v_date - 1;
    EXIT WHEN v_date < CURRENT_DATE - 365;
  END LOOP;

  v_longest := GREATEST(v_longest, v_temp);

  RETURN json_build_object(
    'current_streak', v_current,
    'longest_streak', v_longest
  );
END;
$$;

-- ─── 2. get_weekly_completion: % tasks done this week ───────
CREATE OR REPLACE FUNCTION get_weekly_completion()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_total INTEGER;
  v_completed INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed = TRUE)
  INTO v_total, v_completed
  FROM tasks
  WHERE user_id = v_user_id
    AND date >= DATE_TRUNC('week', CURRENT_DATE)
    AND date <= CURRENT_DATE;

  IF v_total = 0 THEN RETURN 0; END IF;
  RETURN ROUND((v_completed::NUMERIC / v_total) * 100, 1);
END;
$$;

-- ─── 3. get_delay_score: Average rollover count ─────────────
CREATE OR REPLACE FUNCTION get_delay_score()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_avg NUMERIC;
BEGIN
  SELECT AVG(rollover_count)
  INTO v_avg
  FROM tasks
  WHERE user_id = v_user_id
    AND date >= CURRENT_DATE - 30;

  RETURN ROUND(COALESCE(v_avg, 0), 2);
END;
$$;

-- ─── 4. get_heatmap: Completion % per day ───────────────────
CREATE OR REPLACE FUNCTION get_heatmap(p_days INTEGER DEFAULT 90)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(r))
    FROM (
      SELECT
        d.date::TEXT AS date,
        COALESCE(
          ROUND(
            (COUNT(t.id) FILTER (WHERE t.is_completed = TRUE))::NUMERIC /
            NULLIF(COUNT(t.id), 0) * 100,
            1
          ),
          0
        ) AS completion_pct,
        COUNT(t.id) FILTER (WHERE t.is_completed = TRUE) AS completed,
        COUNT(t.id) AS total
      FROM (
        SELECT generate_series(
          CURRENT_DATE - p_days + 1,
          CURRENT_DATE,
          '1 day'::INTERVAL
        )::DATE AS date
      ) d
      LEFT JOIN tasks t ON t.date = d.date AND t.user_id = v_user_id
      GROUP BY d.date
      ORDER BY d.date
    ) r
  );
END;
$$;

-- ─── 5. get_radar_data: Completion % by category ────────────
CREATE OR REPLACE FUNCTION get_radar_data(p_days INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(r))
    FROM (
      SELECT
        c.name AS category,
        c.id AS category_id,
        c.color,
        ROUND(
          (COUNT(t.id) FILTER (WHERE t.is_completed = TRUE))::NUMERIC /
          NULLIF(COUNT(t.id), 0) * 100,
          1
        ) AS value
      FROM categories c
      LEFT JOIN tasks t ON t.category_id = c.id
        AND t.user_id = v_user_id
        AND t.date >= CURRENT_DATE - p_days
      WHERE c.user_id = v_user_id
      GROUP BY c.id, c.name, c.color
      ORDER BY c.name
    ) r
  );
END;
$$;

-- ─── 6. get_time_of_day: Task count by hour ─────────────────
CREATE OR REPLACE FUNCTION get_time_of_day()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(r))
    FROM (
      SELECT
        h.hour,
        COUNT(t.id) AS task_count
      FROM generate_series(0, 23) AS h(hour)
      LEFT JOIN tasks t ON
        EXTRACT(HOUR FROM t.start_time) = h.hour
        AND t.user_id = v_user_id
        AND t.is_completed = TRUE
        AND t.start_time IS NOT NULL
      GROUP BY h.hour
      ORDER BY h.hour
    ) r
  );
END;
$$;

-- ─── 7. get_stacked_bar: Task count by week+category ────────
CREATE OR REPLACE FUNCTION get_stacked_bar(p_weeks INTEGER DEFAULT 8)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(r))
    FROM (
      SELECT
        TO_CHAR(DATE_TRUNC('week', t.date), 'DD/MM') AS week,
        c.name AS category,
        COUNT(t.id) AS task_count
      FROM tasks t
      JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = v_user_id
        AND t.is_completed = TRUE
        AND t.date >= CURRENT_DATE - (p_weeks * 7)
      GROUP BY DATE_TRUNC('week', t.date), c.name
      ORDER BY DATE_TRUNC('week', t.date), c.name
    ) r
  );
END;
$$;

-- ─── 8. get_habit_strength: Composite score 0-100 ───────────
CREATE OR REPLACE FUNCTION get_habit_strength()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_streak_data JSON;
  v_current_streak INTEGER;
  v_consistency_rate NUMERIC;
  v_rollover_rate NUMERIC;
  v_score NUMERIC;
  v_days_with_tasks INTEGER;
  v_total_tasks INTEGER;
  v_total_rollovers INTEGER;
BEGIN
  -- Get streak
  v_streak_data := get_streak();
  v_current_streak := (v_streak_data->>'current_streak')::INTEGER;

  -- Consistency: % of last 30 days with >=1 completed task
  SELECT COUNT(DISTINCT date)
  INTO v_days_with_tasks
  FROM tasks
  WHERE user_id = v_user_id
    AND is_completed = TRUE
    AND date >= CURRENT_DATE - 30;

  v_consistency_rate := v_days_with_tasks::NUMERIC / 30;

  -- Rollover rate
  SELECT COUNT(*), COALESCE(SUM(rollover_count), 0)
  INTO v_total_tasks, v_total_rollovers
  FROM tasks
  WHERE user_id = v_user_id
    AND date >= CURRENT_DATE - 30;

  IF v_total_tasks > 0 THEN
    v_rollover_rate := LEAST(v_total_rollovers::NUMERIC / v_total_tasks, 1);
  ELSE
    v_rollover_rate := 0;
  END IF;

  -- Habit strength formula
  v_score := ROUND(
    0.4 * LEAST(v_current_streak::NUMERIC / 30, 1) * 100 +
    0.4 * v_consistency_rate * 100 +
    0.2 * (1 - v_rollover_rate) * 100
  );

  RETURN json_build_object(
    'score', v_score,
    'consistencyRate', ROUND(v_consistency_rate, 3),
    'rolloverRate', ROUND(v_rollover_rate, 3)
  );
END;
$$;

-- ─── 9. delete_user_account (called from settings) ─────────
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- ─── Grant execute to authenticated users ───────────────────
GRANT EXECUTE ON FUNCTION get_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_completion() TO authenticated;
GRANT EXECUTE ON FUNCTION get_delay_score() TO authenticated;
GRANT EXECUTE ON FUNCTION get_heatmap(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_radar_data(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_time_of_day() TO authenticated;
GRANT EXECUTE ON FUNCTION get_stacked_bar(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_habit_strength() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
