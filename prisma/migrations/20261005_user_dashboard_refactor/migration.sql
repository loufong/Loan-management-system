-- Migration: 20261005_user_dashboard_refactor
-- Purpose: Add avatar_url, last_login to users table and create user_settings table

-- 1. Add avatar_url and last_login columns to users table
ALTER TABLE "users" 
  ADD COLUMN IF NOT EXISTS "avatar_url" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "last_login" TIMESTAMPTZ(6);

-- 2. Create user_settings table for dashboard persistence
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "theme" VARCHAR(20) NOT NULL DEFAULT 'light',
  "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "branch" VARCHAR(100) NOT NULL DEFAULT 'Phnom Penh Main Branch',
  "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- 3. Create unique index and foreign key on user_id
CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_user_id_key" ON "user_settings"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_user_id_fkey'
  ) THEN
    ALTER TABLE "user_settings" 
      ADD CONSTRAINT "user_settings_user_id_fkey" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
