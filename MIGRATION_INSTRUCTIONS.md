# Database Migration Instructions

The application is failing because the required database tables don't exist in your Supabase project. You need to manually apply the migration to fix the "relation does not exist" errors.

## Steps to Fix:

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Execute the Migration**
   - Copy the **entire contents** of `supabase/migrations/20250701075012_broken_spring.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the migration

4. **Verify Tables Were Created**
   - Go to "Table Editor" in the left sidebar
   - You should see these tables:
     - `email_verifications`
     - `users`
     - `sessions`
     - `bets`
     - `results`
     - `transactions`
     - `withdrawals`

## What This Migration Does:

- **Creates all necessary tables** for the lottery application
- **Sets up Row Level Security (RLS)** policies for data protection
- **Creates database functions** for OTP verification and user management
- **Inserts default admin users** and sample sessions
- **Creates indexes** for better performance
- **Sets up proper relationships** between tables

## After Running the Migration:

The application should work properly and the "relation does not exist" errors will be resolved. You should be able to:
- View lottery sessions
- Place bets
- See results
- Manage transactions
- Handle withdrawals

## Troubleshooting:

If you encounter any issues:

1. **Check for syntax errors**: Make sure you copied the entire migration file
2. **Verify permissions**: Ensure your Supabase project has the necessary permissions
3. **Check the logs**: Look at the SQL Editor output for any error messages

## Alternative: Reset and Recreate

If you encounter persistent issues, you can:
1. Go to Settings > Database in your Supabase dashboard
2. Reset your database (⚠️ **this will delete all data**)
3. Then run the migration script

**Note:** Only reset if you don't have important data in your database.

## Need Help?

If you're still experiencing issues after running the migration:
1. Check that all tables were created in the Table Editor
2. Verify that the functions were created in the Database Functions section
3. Ensure RLS policies are active on all tables