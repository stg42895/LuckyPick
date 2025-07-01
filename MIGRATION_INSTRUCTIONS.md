# Database Migration Instructions

The application is failing because the required database tables don't exist in your Supabase project. You need to manually apply the migration.

## Steps to Fix:

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Execute the Migration**
   - Copy the entire contents of `supabase/migrations/20250701075012_broken_spring.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the migration

4. **Verify Tables Were Created**
   - Go to "Table Editor" in the left sidebar
   - You should see these tables:
     - email_verifications
     - users
     - sessions
     - bets
     - results
     - transactions
     - withdrawals

## What This Migration Does:

- Creates all necessary tables for the lottery application
- Sets up Row Level Security (RLS) policies
- Creates database functions for OTP verification
- Inserts default admin users and sample sessions
- Creates indexes for better performance

## After Running the Migration:

The application should work properly and the "relation does not exist" errors will be resolved.

## Alternative: Reset and Recreate

If you encounter any issues, you can also:
1. Go to Settings > Database in your Supabase dashboard
2. Reset your database (this will delete all data)
3. Then run the migration script

**Note:** Only reset if you don't have important data in your database.