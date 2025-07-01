/*
# Complete LuckyPick Database Schema Setup

This migration creates all necessary tables and functions for the lottery application.

## What this migration does:

1. **New Tables Created:**
   - `email_verifications` - Stores OTP codes for email verification
   - `users` - User accounts with wallet balances and admin flags
   - `sessions` - Lottery draw sessions with timing and pool information
   - `bets` - Individual user bets on numbers
   - `results` - Lottery results with winning numbers and payouts
   - `transactions` - Financial transaction history
   - `withdrawals` - Withdrawal requests and their status

2. **Security Setup:**
   - Row Level Security (RLS) enabled on all tables
   - Policies for user data access and admin privileges
   - Proper authentication checks

3. **Database Functions:**
   - OTP generation and verification system
   - User account creation with email verification
   - Cleanup functions for expired data

4. **Sample Data:**
   - Default admin users
   - Sample lottery sessions for today
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (use CASCADE to handle dependencies)
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS generate_otp() CASCADE;
DROP FUNCTION IF EXISTS create_email_verification(TEXT) CASCADE;
DROP FUNCTION IF EXISTS verify_otp(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_email_verified(TEXT) CASCADE;
DROP FUNCTION IF EXISTS can_resend_otp(TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_otps() CASCADE;
DROP FUNCTION IF EXISTS create_user_account(TEXT, TEXT, TEXT) CASCADE;

-- Drop existing views if they exist
DROP VIEW IF EXISTS session_stats CASCADE;

-- Email verifications table for OTP system
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users table with email verification
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT, -- For future password-based auth
  is_admin BOOLEAN DEFAULT false,
  wallet_balance DECIMAL(10,2) DEFAULT 100.00,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions table for lottery draws
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  time TEXT NOT NULL,
  date TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  bets_close_at TEXT NOT NULL,
  total_pool DECIMAL(10,2) DEFAULT 0.00,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bets table for user bets
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number >= 0 AND number <= 9),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Results table for lottery results
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  winning_number INTEGER NOT NULL CHECK (winning_number >= 0 AND winning_number <= 9),
  total_pool DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  admin_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  winner_count INTEGER NOT NULL DEFAULT 0,
  winner_payout DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_zero_bet_win BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions table for financial records
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win')),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Withdrawals table for withdrawal requests
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by TEXT
);

-- Enable Row Level Security on all tables
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Email verification policies (allow public access for signup flow)
CREATE POLICY "Anyone can read email verifications for verification" ON email_verifications
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create email verifications" ON email_verifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update email verifications for verification" ON email_verifications
  FOR UPDATE TO anon, authenticated
  USING (true);

-- Users policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Anyone can create user accounts" ON users
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text AND is_admin = true
    )
  );

-- Sessions policies
CREATE POLICY "Anyone can read sessions" ON sessions
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage sessions" ON sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text AND is_admin = true
    )
  );

-- Bets policies
CREATE POLICY "Users can read own bets" ON bets
  FOR SELECT TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own bets" ON bets
  FOR INSERT TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Admins can read all bets" ON bets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text AND is_admin = true
    )
  );

-- Results policies
CREATE POLICY "Anyone can read results" ON results
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage results" ON results
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text AND is_admin = true
    )
  );

-- Transactions policies
CREATE POLICY "Users can read own transactions" ON transactions
  FOR SELECT TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own transactions" ON transactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Admins can read all transactions" ON transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text AND is_admin = true
    )
  );

-- Withdrawals policies
CREATE POLICY "Users can read own withdrawals" ON withdrawals
  FOR SELECT TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own withdrawals" ON withdrawals
  FOR INSERT TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Admins can manage all withdrawals" ON withdrawals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text AND is_admin = true
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_email_verifications_email ON email_verifications(email);
CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_session_id ON bets(session_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);

-- Function to generate 6-digit OTP
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to create email verification with OTP
CREATE OR REPLACE FUNCTION create_email_verification(user_email TEXT)
RETURNS TABLE(otp_code TEXT, expires_at TIMESTAMPTZ) AS $$
DECLARE
  new_otp TEXT;
  expiry TIMESTAMPTZ;
BEGIN
  -- Generate new OTP
  new_otp := generate_otp();
  expiry := now() + interval '10 minutes';
  
  -- Delete any existing unverified OTPs for this email
  DELETE FROM email_verifications 
  WHERE email = user_email AND verified = false;
  
  -- Insert new OTP
  INSERT INTO email_verifications (email, otp_code, expires_at)
  VALUES (user_email, new_otp, expiry);
  
  RETURN QUERY SELECT new_otp, expiry;
END;
$$ LANGUAGE plpgsql;

-- Function to verify OTP
CREATE OR REPLACE FUNCTION verify_otp(user_email TEXT, provided_otp TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  verification_record RECORD;
BEGIN
  -- Get the latest verification record for this email
  SELECT * INTO verification_record
  FROM email_verifications
  WHERE email = user_email 
    AND verified = false 
    AND expires_at > now()
    AND attempts < 5
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no valid record found
  IF verification_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Increment attempts
  UPDATE email_verifications
  SET attempts = attempts + 1
  WHERE id = verification_record.id;
  
  -- Check if OTP matches
  IF verification_record.otp_code = provided_otp THEN
    -- Mark as verified
    UPDATE email_verifications
    SET verified = true
    WHERE id = verification_record.id;
    
    -- Update user email verification status if user exists
    UPDATE users
    SET email_verified = true, email_verified_at = now()
    WHERE email = user_email;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to check if email is verified
CREATE OR REPLACE FUNCTION is_email_verified(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_verified BOOLEAN;
BEGIN
  SELECT email_verified INTO is_verified
  FROM users
  WHERE email = user_email;
  
  RETURN COALESCE(is_verified, false);
END;
$$ LANGUAGE plpgsql;

-- Function to check if can resend OTP (rate limiting)
CREATE OR REPLACE FUNCTION can_resend_otp(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  last_sent TIMESTAMPTZ;
BEGIN
  SELECT created_at INTO last_sent
  FROM email_verifications
  WHERE email = user_email
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Allow resend if no previous OTP or last one was sent more than 1 minute ago
  RETURN (last_sent IS NULL OR last_sent < now() - interval '1 minute');
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired OTP records
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verifications
  WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Function to create user account with email verification
CREATE OR REPLACE FUNCTION create_user_account(
  user_email TEXT,
  user_full_name TEXT,
  user_phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if email is verified
  IF NOT is_email_verified(user_email) THEN
    RAISE EXCEPTION 'Email must be verified before creating account';
  END IF;
  
  -- Create user account
  INSERT INTO users (email, full_name, phone, email_verified, email_verified_at)
  VALUES (user_email, user_full_name, user_phone, true, now())
  RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default admin user
INSERT INTO users (id, email, full_name, is_admin, wallet_balance, email_verified, email_verified_at) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@luckypick.com',
  'System Administrator',
  true,
  0,
  true,
  now()
) ON CONFLICT (email) DO NOTHING;

-- Insert default demo users for testing
INSERT INTO users (email, full_name, is_admin, wallet_balance, email_verified, email_verified_at) 
VALUES 
  ('test@gmail.com', 'Demo User', false, 1000, true, now()),
  ('Admin@admin.com', 'System Admin', true, 0, true, now())
ON CONFLICT (email) DO NOTHING;

-- Insert sample sessions for today
DO $$
DECLARE
  today_date TEXT := to_char(now(), 'YYYY-MM-DD');
BEGIN
  INSERT INTO sessions (name, time, date, is_active, bets_close_at, total_pool, created_by)
  VALUES 
    ('Afternoon Draw', '13:30', today_date, true, '13:25', 0, 'system'),
    ('Evening Draw', '18:30', today_date, true, '18:25', 0, 'system')
  ON CONFLICT DO NOTHING;
END $$;

-- Create a view for session statistics
CREATE OR REPLACE VIEW session_stats AS
SELECT 
  s.id,
  s.name,
  s.time,
  s.date,
  s.is_active,
  s.total_pool,
  COUNT(DISTINCT b.user_id) as unique_bettors,
  COUNT(b.id) as total_bets,
  COALESCE(r.winning_number, -1) as winning_number,
  COALESCE(r.winner_count, 0) as winner_count,
  COALESCE(r.admin_fee, 0) as admin_fee
FROM sessions s
LEFT JOIN bets b ON s.id = b.session_id
LEFT JOIN results r ON s.id = r.session_id
GROUP BY s.id, s.name, s.time, s.date, s.is_active, s.total_pool, r.winning_number, r.winner_count, r.admin_fee
ORDER BY s.date DESC, s.time DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;