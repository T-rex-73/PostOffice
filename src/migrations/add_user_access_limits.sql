-- Migration: Add user access limit columns
-- Run this in your Supabase SQL editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_duration TEXT
    CHECK (access_duration IN ('day', 'month', 'year', 'unlimited')),
  ADD COLUMN IF NOT EXISTS access_start    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_until    TIMESTAMPTZ;

-- access_duration : the duration type set by global_admin
-- access_start    : when the limit period was last set
-- access_until    : computed expiry datetime (NULL = unlimited / not set)

-- Optional index to find soon-to-expire users quickly
CREATE INDEX IF NOT EXISTS idx_users_access_until ON users (access_until)
  WHERE access_until IS NOT NULL;
