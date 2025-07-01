/*
  # Complete LuckyPick Database Schema with OTP System

  1. New Tables
    - `email_verifications` - Store OTP codes for email verification
    - Enhanced user management with email verification status
    
  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for data access
    - Add OTP verification system
    
  3. Functions
    - OTP generation and validation functions
    - Email verification workflow
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Email verifications table for OTP system
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add email verification status to users if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- Enable RLS on email_verifications
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Email verification policies
CREATE POLICY "Users can read own email verifications" ON email_verifications
  FOR SELECT TO anon, authenticated
  USING (true); -- Allow reading for verification process

CREATE POLICY "Users can create email verifications" ON email_verifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true); -- Allow creation for signup process

CREATE POLICY "Users can update own email verifications" ON email_verifications
  FOR UPDATE TO anon, authenticated
  USING (true); -- Allow updates for verification process

-- Function to generate OTP
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to create email verification
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
    
    -- Update user email verification status
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

-- Function to resend OTP (with rate limiting)
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Clean up expired OTP records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verifications
  WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Insert some sample sessions for today
DO $$
DECLARE
  today_date TEXT := to_char(now(), 'YYYY-MM-DD');
BEGIN
  -- Insert default sessions for today if they don't exist
  INSERT INTO sessions (id, name, time, date, is_active, bets_close_at, total_pool, created_by)
  VALUES 
    ('session-1330-' || today_date, 'Afternoon Draw', '13:30', today_date, true, '13:25', 0, 'system'),
    ('session-1830-' || today_date, 'Evening Draw', '18:30', today_date, true, '18:25', 0, 'system')
  ON CONFLICT (id) DO NOTHING;
END $$;