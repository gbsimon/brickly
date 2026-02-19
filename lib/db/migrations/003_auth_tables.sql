-- Migration 003: Auth adapter tables
-- Required for Apple sign-in account linking and Email magic link verification tokens
-- Run this against your Postgres database before enabling Apple or Email auth providers

-- Add email_verified column to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TIMESTAMPTZ;

-- Create accounts table for provider account linking
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- Create verification_tokens table for email magic links
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  UNIQUE(identifier, token)
);
