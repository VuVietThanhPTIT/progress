-- Migration: Add recurrence column to tasks table for recurring tasks (daily, weekly, monthly, yearly)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none';

-- Add index for fast querying of recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence);
