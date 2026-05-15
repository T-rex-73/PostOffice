-- Add access_day_count and access_year_count columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_day_count integer,
  ADD COLUMN IF NOT EXISTS access_year_count integer;
