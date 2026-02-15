-- Update RLS policy for words table to allow anonymous inserts
-- This allows the app to work without authentication

-- First, disable RLS on the words table (simplest solution for development)
ALTER TABLE words DISABLE ROW LEVEL SECURITY;

-- Or if you want to keep RLS enabled, use this policy instead:
-- Allow all operations for anonymous users
-- CREATE POLICY "Allow anonymous access" ON words
--   FOR ALL
--   TO anon
--   USING (true)
--   WITH CHECK (true);
